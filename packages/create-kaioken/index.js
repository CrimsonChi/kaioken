#!/usr/bin/env node
import fs from "node:fs"
import { simpleGit } from "simple-git"
import { program } from "commander"
import inquirer from "inquirer"

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

const defaultDir = "my-new-app"

program
  .option("-csr, --csr", "Use CSR template")
  .option("-ssr, --ssr", "Use SSR template")
  .option("-d, --dest <dest>", "Destination directory")
  .action(async ({ dest, csr, ssr }) => {
    let template = ""
    if ((csr && ssr) || (!csr && !ssr)) {
      const { selectedTemplate } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedTemplate",
          message: "Choose a template:",
          choices: templates,
        },
      ])
      template = selectedTemplate
    } else {
      if (csr) template = templates[0].value
      if (ssr) template = templates[1].value
    }

    if (!dest) {
      const { selectedDest } = await inquirer.prompt([
        {
          type: "input",
          name: "selectedDest",
          message: "Destination directory:",
          default: defaultDir,
        },
      ])
      dest = selectedDest
    }

    // check if the folder exists already and ask if it should be overwritten
    if (fs.existsSync(dest)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "list",
          name: "overwrite",
          message: "The folder already exists. Do you want to overwrite it?",
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
      if (overwrite !== "y") return
      fs.rmSync(dest, { recursive: true, force: true })
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
    console.log(`Project template downloaded. Get started by running the following:

  cd ${dest}
  pnpm install
  pnpm dev
`)
  })

program.parse(process.argv)
