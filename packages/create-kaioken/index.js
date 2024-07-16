#!/usr/bin/env node

import download from "download-git-repo"
import { program } from "commander"
import inquirer from "inquirer"

const templates = [
  {
    name: "CSR (Client-side rendering)",
    value: "CrimsonChi/kaioken-csr-template",
  },
  {
    name: "SSR/SSG (Server-side rendering)",
    value: "CrimsonChi/kaioken-ssr-template",
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

    console.log(`Downloading project template '${template}'...`)
    await new Promise((resolve, reject) => {
      download(template, dest, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    console.log(`Project template downloaded. Get started by running the following:

  cd ${dest}
  pnpm install
  pnpm dev
`)
  })

program.parse(process.argv)
