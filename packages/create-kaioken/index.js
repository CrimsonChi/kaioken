#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { simpleGit } from "simple-git"
import { program } from "commander"
import inquirer from "inquirer"
import { execa } from "execa"

// detect the package manager used by the user
const detectPackageManager = () => {
  const execPath = process.env.npm_execpath || ""
  if (execPath.includes("pnpm")) {
    return "pnpm"
  }
  if (execPath.includes("yarn")) {
    return "yarn"
  }
  if (execPath.includes("bun")) {
    return "bun"
  }
  return "npm"
}

const templates = [
  {
    name: "CSR (Client-side rendering)",
    value: "https://github.com/CrimsonChi/kaioken-csr-template.git",
  },
  {
    name: "SSR/SSG (Server-side rendering)",
    value: "https://github.com/CrimsonChi/kaioken-ssr-template.git",
  },
]

const defaultDir = "."

program
  .option("-d, --dest <dest>", "Destination directory")
  .option("-csr, --csr", "Use CSR template")
  .option("-ssr, --ssr", "Use SSR template")
  .action(async ({ dest, csr, ssr }) => {
    console.log("Welcome to Kaioken!\n")
    if (!dest) {
      const { selectedDest } = await inquirer.prompt([
        {
          type: "input",
          name: "selectedDest",
          message:
            "Where should we create your project? \n(default: current directory)",
          default: defaultDir,
        },
      ])
      dest = selectedDest
    }

    // if the folder exists already and contains files, ask if it should be overwritten
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest)
      if (stats.isDirectory()) {
        const destChildren = fs.readdirSync(dest)
        if (destChildren.length > 0) {
          const { overwrite } = await inquirer.prompt([
            {
              type: "list",
              name: "overwrite",
              message:
                "The folder already exists and is not empty. \nIn order to proceed, it will be deleted. Do you want to continue?",
              choices: [
                {
                  name: "Yes",
                  value: "y",
                },
                {
                  name: "No",
                  value: "n",
                },
              ],
            },
          ])
          if (overwrite === "n") return

          for (const file of destChildren) {
            const filePath = path.join(dest, file)
            fs.rmSync(filePath, { recursive: true, force: true })
          }
        }
      } else if (stats.isFile()) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "list",
            name: "overwrite",
            message:
              "There is already a file at the destination. \nIn order to proceed, it will be deleted. Do you want to continue?",
            choices: [
              {
                name: "Yes",
                value: "y",
              },
              {
                name: "No",
                value: "n",
              },
            ],
          },
        ])
        if (overwrite === "n") return
        fs.rmSync(dest, { recursive: true, force: true })
      } else {
        throw new Error(`Unknown file type at ${dest}. Exiting...`)
      }
    }

    let template = ""
    if ((csr && ssr) || (!csr && !ssr)) {
      const { selectedTemplate } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedTemplate",
          message: "Which template do you want to use?",
          choices: templates,
        },
      ])
      template = selectedTemplate
    } else {
      if (csr) template = templates[0].value
      if (ssr) template = templates[1].value
    }

    console.log(`Downloading project template '${template}'...`)
    try {
      const git = simpleGit()
      await git.clone(template, dest)
    } catch (error) {
      console.error(
        `[create-kaioken]: An error occurred while cloning the template:`,
        error
      )
      return
    }

    // remove '.git' folder
    const gitFolder = `${dest}/.git`
    if (fs.existsSync(gitFolder)) {
      fs.rmSync(gitFolder, { recursive: true, force: true })
    }

    const { pnpm, yarn, bun } = await detect()
    console.log("detected", pnpm, yarn, bun)
    let installCwd, devCmd
    if (pnpm) {
      devCmd = "pnpm dev"
    } else if (yarn) {
      devCmd = "yarn dev"
    } else if (bun) {
      devCmd = "bun dev"
    } else {
      devCmd = "npm run dev"
    }

    const { packageManager } = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager do you want to use?",
        choices: [
          { name: "npm", value: "npm" },
          { name: "pnpm", value: "pnpm" },
          { name: "yarn", value: "yarn" },
        ],
        default: detectedPackageManager,
      },
    ])

    console.log(`Project template downloaded. Get started by running the following:
    
    

  cd ${dest}
  ${packageManager} install
  ${devCmd}
`)
  })

program.parse(process.argv)

/**
 * @param {cwd} current working directory
 * @returns an object of booleans indicating which package managers are available
 */
const detect = async () => {
  const [hasYarn, hasPnpm, hasBun] = await Promise.all([
    hasGlobalInstallation("yarn"),
    hasGlobalInstallation("pnpm"),
    hasGlobalInstallation("bun"),
  ])
  return {
    yarn: hasYarn,
    pnpm: hasPnpm,
    bun: hasBun,
  }
}

export { detect }

/**
 * Check if a global pm is available
 */
function hasGlobalInstallation(pm) {
  return execa(pm, ["--version"])
    .then((res) => {
      return /^\d+.\d+.\d+$/.test(res.stdout)
    })
    .catch(() => false)
}
