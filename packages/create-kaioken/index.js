#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { simpleGit } from "simple-git"
import { program } from "commander"
import inquirer from "inquirer"
import { execa } from "execa"

const executingPackageManager =
  process.argv[1]
    .split("/")
    .find(
      (x) =>
        x.includes("pnpm") ||
        x.includes("yarn") ||
        x.includes("bun") ||
        x.includes("npx")
    ) || "npx"

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

    const availablePackageManagers = await detectPackageManager()
    const _pm =
      executingPackageManager === "npx" ? "npm" : executingPackageManager

    const { packageManager } = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager do you want to use?",
        choices: availablePackageManagers,
        default: availablePackageManagers.find((pm) => pm.value === _pm),
      },
    ])

    let devCmd
    if (packageManager === "pnpm") {
      devCmd = "pnpm dev"
    } else if (packageManager === "yarn") {
      devCmd = "yarn dev"
    } else if (packageManager === "bun") {
      devCmd = "bun dev"
    } else {
      devCmd = "npm run dev"
    }
    console.log(`Project template downloaded. Get started by running the following:
    
    
  cd ${dest}
  ${packageManager} install
  ${devCmd}
`)
  })

program.parse(process.argv)

const detectPackageManager = async () => {
  const [hasYarn, hasPnpm, hasBun] = await Promise.all([
    hasGlobalInstallation("yarn"),
    hasGlobalInstallation("pnpm"),
    hasGlobalInstallation("bun"),
  ])

  const packageManagers = []
  if (hasPnpm) packageManagers.push({ name: "pnpm", value: "pnpm" })
  if (hasYarn) packageManagers.push({ name: "yarn", value: "yarn" })
  if (hasBun) packageManagers.push({ name: "bun", value: "bun" })
  packageManagers.push({ name: "npm", value: "npm" }) // npm as fallback

  return packageManagers
}

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
