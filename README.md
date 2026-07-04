# Card Conjurer
Card Conjurer was created by a passionate Magic the Gathering player and grew to become probably the most popular online card generator known to the game.
In November of 2022, Wizards of the Coast served the original creator and webhost of the site with Ceas and Desist paperwork, forcing the site offline.
This repository is for the purpose of making the application usable on your local machine and maintaining templates in perpetuity.
## Setup
- Clone this repo somewhere on your system. (Or download the Zip with CODE > Download Zip above)
- **Linux Mint / desktop launcher:** run `setup-desktop.sh` once to create a double-clickable icon on your desktop
- **Other platforms:** Run `server.exe` (or `mac-server` for MacOS, `linux-server` for linux), or use Docker / WAMP / XAMPP, etc.


[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?longCache=true&style=popout)](https://www.paypal.me/kyleburtondonate
) ← Help out Card Conjurer's original creator, Kyle. We love you buddy.


## Start with Docker (http://localhost:4242/)

<details>
  <summary>Install Make on Ubuntu</summary>

  ```bash
  $ sudo apt update
  ```

  check is make installed

  ```bash
  $ make -version
  ```

  after run this command, you got the following error? 
  
  - **bash: /usr/bin/make: No such file or directory**

  then follow with the next step, otherwise skip the next commands

  ```bash
  $ sudo apt install make
  ```

### Troubleshooting's? 
 * Follow this guide https://linuxhint.com/install-make-ubuntu/
</details>

<details>
  <summary>Install Make on Mac</summary>

  check is make installed

  ```bash
  $ make -version
  ```

  after run this command, you got the following error? 
  
  - **zsh: command not found: make**

  then follow with the next step, otherwise skip the next commands

  ```bash
  $ (sudo) brew install make
  ```
</details>

<details>
  <summary>Install Make on Windows</summary>

  Follow this Guide
  https://sp21.datastructur.es/materials/guides/make-install.html#windows-installation
</details>

* go to the downloaded/ cloned folder with your terminal/ powershell (windows) and run the following command

```bash
$ make start
```

Open your Browser with the following URL 

http://localhost:4242/

### Important

Be sure, that you are running Docker Desktop under Windows or Mac before you can run the make command.

## Using Local Images

If you're saving a lot of cards with custom images you might hit the data limit for uploaded images (about 2MB).

You can avoid this by putting image files in the `local_art` directory of this repo. The Art tab in the card creator will automatically show a dropdown listing every image in that folder — just select one to load it instantly.

You can also type a bare filename (e.g. `my_art.jpg`) in the "Via URL" field and hit enter. This resolves to `local_art/my_art.jpg` so the image is referenced directly from disk instead of being stored in your save file.

For example, if you add the file:
`cardconjurer/local_art/my_art.jpg`

You can load it by either:
- Picking it from the **"Or pick a local art file from local_art/"** dropdown
- Typing `my_art.jpg` in the **"Via URL"** box and hitting enter
