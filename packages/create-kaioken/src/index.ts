import prompts from "prompts"
import minimist from "minimist"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

type TemplateOption = {
  id: string
  display: string
  path: string
}

const templates: TemplateOption[] = [
  {
    id: "csr",
    display: "CSR",
    path: "template-csr",
  },
  {
    id: "ssr-vike",
    display: "SSR (Vike)",
    path: "template-ssr-vike",
  },
]
const templateIds = templates.map((t) => t.id)
const renameFiles: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(" ")[0]
  const pkgSpecArr = pkgSpec.split("/")
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  )
}
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-")
}

const fsUtils = {
  formatTargetDir(targetDir: string | undefined) {
    return targetDir?.trim().replace(/\/+$/g, "")
  },
  isEmpty(path: string) {
    const files = fs.readdirSync(path)
    return files.length === 0 || (files.length === 1 && files[0] === ".git")
  },
  emptyDir(dir: string) {
    if (!fs.existsSync(dir)) {
      return
    }
    for (const file of fs.readdirSync(dir)) {
      if (file === ".git") {
        continue
      }
      fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
    }
  },
  copyDir(srcDir: string, destDir: string) {
    fs.mkdirSync(destDir, { recursive: true })
    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.resolve(srcDir, file)
      const destFile = path.resolve(destDir, file)
      fsUtils.copy(srcFile, destFile)
    }
  },
  copy(src: string, dest: string) {
    const stat = fs.statSync(src)
    if (stat.isDirectory()) {
      fsUtils.copyDir(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  },
}

const argv = minimist<{
  t?: string
  template?: string
}>(process.argv.slice(2), { string: ["_"] })
const cwd = process.cwd()
const defaultTargetDir = "new-kaioken-project"

async function init() {
  const argTargetDir = fsUtils.formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t

  let targetDir = argTargetDir || defaultTargetDir
  const getProjectName = () =>
    targetDir === "." ? path.basename(path.resolve()) : targetDir

  let result: prompts.Answers<
    "projectName" | "overwrite" | "packageName" | "templateId"
  >

  prompts.override({
    overwrite: argv.overwrite,
  })

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: "Project name:",
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = fsUtils.formatTargetDir(state.value) || defaultTargetDir
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || fsUtils.isEmpty(targetDir)
              ? null
              : "select",
          name: "overwrite",
          message: () =>
            (targetDir === "."
              ? "Current directory"
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          initial: 0,
          choices: [
            {
              title: "Remove existing files and continue",
              value: "yes",
            },
            {
              title: "Cancel operation",
              value: "no",
            },
            {
              title: "Ignore files and continue",
              value: "ignore",
            },
          ],
        },
        {
          type: (_, { overwrite }: { overwrite?: string }) => {
            if (overwrite === "no") {
              throw new Error("Operation cancelled")
            }
            return null
          },
          name: "overwriteChecker",
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : "text"),
          name: "packageName",
          message: "Package name:",
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) =>
            isValidPackageName(dir) || "Invalid package.json name",
        },
        {
          type:
            argTemplate && templateIds.includes(argTemplate) ? null : "select",
          name: "templateId",
          message:
            typeof argTemplate === "string" &&
            !templateIds.includes(argTemplate)
              ? `"${argTemplate}" isn't a valid template. Please choose from below: `
              : "Select a template:",
          initial: 0,
          choices: templates.map((template) => {
            return {
              title: template.display,
              value: template.id,
            }
          }),
        },
      ],
      {
        onCancel: () => {
          throw new Error("Operation cancelled")
        },
      }
    )
  } catch (error) {
    console.log(error.message)
    return
  }

  const { templateId, overwrite, packageName } = result
  const root = path.join(cwd, targetDir)

  if (overwrite === "yes") {
    fsUtils.emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  const template = templates.find((t) => t.id === templateId)!
  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    "../..",
    `template-${template}`
  )

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : "npm"

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      fsUtils.copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== "package.json")) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), "utf-8")
  )

  pkg.name = packageName || getProjectName()
  write("package.json", JSON.stringify(pkg, null, 2) + "\n")

  const cdProjectName = path.relative(cwd, root)
  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(
      `  cd ${
        cdProjectName.includes(" ") ? `"${cdProjectName}"` : cdProjectName
      }`
    )
  }

  switch (pkgManager) {
    case "yarn":
      console.log("  yarn")
      console.log("  yarn dev")
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

init()
