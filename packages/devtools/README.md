# Chrome Extention template using Kaioken
here's how you should use this Repository:  
- First clone this Repo on your machine:
```bash
  git clone https://github.com/saranatour1/chrome-extention-kaioken-template-ts.git
```
- then cd into the repo, and install the packages:
```bash
cd chrome-extention-kaioken-template-ts
pnpm i
pnpm dev 
```
- next, go to chrome on [chrome://extensions/](chrome://extensions/) and tick the developers mode,
![image](https://github.com/saranatour1/chrome-extention-kaioken-template-ts/assets/77834808/88b3960b-5149-45e8-a2ad-d0a2a19b42fc)
- then, click on load unpacked and import the dist file,
  ![image](https://github.com/saranatour1/chrome-extention-kaioken-template-ts/assets/77834808/e5465390-5a8d-43f8-a4d2-c4b0f13ae253)
and voilà! you should be able to load the template in dev mode!
- in the vite config file, the following lines can be added to support hmr in dev mode,
```ts
    server: {
      port: 5173,
      strictPort: true,
      hmr: { port: 5173 },
    },
```
- if you want to use it outside of dev-mode, build the template.
```bash
pnpm build
```
