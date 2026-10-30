<!--
  Profile README for @TrishaAdio
  - Artwork in assets/ is generated from profile.config.json:  node scripts/build.mjs static
  - stats.svg and the contribution snake are rebuilt twice a day by .github/workflows/profile.yml
    and published to the `output` branch.
-->

<p align="center">
  <img src="assets/hero.svg" width="100%" alt="Trisha Adio: Python dev, bot builder, ML tinkerer. A ghost in headphones bobs to lo-fi beats while a terminal types: building Telegram bots that actually scale, turning Python into production services, playing with TTS and ML models, self-hosting everything I can.">
</p>

<p align="center">
  <a href="https://t.me/TrishaAdio"><img src="https://img.shields.io/badge/telegram-%40TrishaAdio-22d3ee?style=flat-square&logo=telegram&logoColor=white&labelColor=14121f" alt="Telegram: @TrishaAdio"></a>
  <a href="https://github.com/TrishaAdio?tab=repositories"><img src="https://img.shields.io/badge/browse-all_repos-a855f7?style=flat-square&logo=github&logoColor=white&labelColor=14121f" alt="Browse all repositories"></a>
  <img src="https://komarev.com/ghpvc/?username=TrishaAdio&label=profile%20views&color=f472b6&style=flat-square" alt="Profile views">
</p>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/title-about-dark.svg">
  <img src="assets/title-about-light.svg" width="100%" alt="01 / About: Bots, backends & tiny ML things.">
</picture>

I build **Telegram bots** and the backend services that power them, tinker with **text-to-speech and small ML models**, and **self-host** whatever I can: reverse proxies, image hosts, the whole stack. Most of my repos run in production, not just on my laptop.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class TrishaAdio:
    role: str = "Backend & bot developer"
    speaks: tuple = ("Python", "JavaScript", "TypeScript")
    builds: tuple = ("Telegram bots", "TTS / ML models", "self-hosted services")
    side_quests: tuple = ("Minecraft mods", "3D web toys", "desktop apps")
    currently: str = "Shipping premium bots & scaling infra"

    def say_hi(self) -> str:
        return "Thanks for stopping by. Let's build something great!"


print(TrishaAdio().say_hi())
```

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/title-stack-dark.svg">
  <img src="assets/title-stack-light.svg" width="100%" alt="02 / Stack: Tools I reach for.">
</picture>

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,js,ts,nodejs,fastapi,flask,postgres,sqlite,redis&theme=dark" alt="Python, JavaScript, TypeScript, Node.js, FastAPI, Flask, PostgreSQL, SQLite, Redis"><br>
  <img src="https://skillicons.dev/icons?i=docker,linux,nginx,bash,go,java,kotlin,react,threejs&theme=dark" alt="Docker, Linux, Nginx, Bash, Go, Java, Kotlin, React, Three.js"><br>
  <img src="https://skillicons.dev/icons?i=vite,tailwind,tauri,html,git,github,vscode&theme=dark" alt="Vite, Tailwind CSS, Tauri, HTML, Git, GitHub, VS Code">
</p>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/title-featured-dark.svg">
  <img src="assets/title-featured-light.svg" width="100%" alt="03 / Featured: Things I've shipped.">
</picture>

<p align="center">
  <a href="https://github.com/TrishaAdio/Music"><img src="assets/card-rioera.svg" width="49%" alt="RioEra, a Telegram music bot: streams music into group voice chats, with several audio sources tried in turn so one outage can't stop it."></a>
  <a href="https://github.com/TrishaAdio/channelguard"><img src="assets/card-channelguard.svg" width="49%" alt="ChannelGuard, a Telegram admin bot: add it as an admin and it sets itself up, with approval-only invite links, join requests and templates from your DM."></a>
  <a href="https://github.com/TrishaAdio/TtsModel"><img src="assets/card-voice.svg" width="49%" alt="Voice model training: fine-tunes a natural GPT-SoVITS voice from your own clips, then serves it over an API."></a>
  <a href="https://github.com/TrishaAdio/SiteDNA"><img src="assets/card-sitedna.svg" width="49%" alt="SiteDNA: give it a landing page URL and get a ZIP of every colour, font, shadow and animation, plus design tokens."></a>
  <a href="https://github.com/TrishaAdio/5seconds"><img src="assets/card-fiveseconds.svg" width="49%" alt="Five Seconds, a 3D web experience: press space and time stops for five seconds on a rain-soaked neon street."></a>
  <a href="https://github.com/TrishaAdio/TrishaPlayer"><img src="assets/card-trishaplayer.svg" width="49%" alt="TrishaPlayer: an autonomous Minecraft player that joins your server and plays."></a>
</p>

<details>
<summary><b>More projects, by category</b></summary>
<br>

**Telegram bots & userbots**
- [NewEra](https://github.com/TrishaAdio/NewEraMusic): group-call music bot with a TypeScript control plane and a Go audio sidecar
- [QuickReply](https://github.com/TrishaAdio/quickreply): userbot for quick replies, away messages, payment logs and account backups
- [Saviour](https://github.com/TrishaAdio/Saviour): keeps a channel post pointing at a backup channel that's actually alive
- [Req](https://github.com/TrishaAdio/Req): welcomes every join request with your saved post, then broadcasts to that audience
- [Recycle](https://github.com/TrishaAdio/Recycle): anti-spam userbot that bans spammers and locks groups down on command
- [vidpack](https://github.com/TrishaAdio/vision): turns a video into a timeline, transcript and keyframe sheets a chat model can read
- [Aura Image Bot](https://github.com/TrishaAdio/Image): photo enhancement and effects, right inside Telegram
- [Emoji Pack Exporter](https://github.com/TrishaAdio/emoji): exports a whole custom emoji pack as AI-readable Markdown and JSON

**Minecraft**
- [Pegasus](https://github.com/TrishaAdio/Pegasus): tameable winged horses and unicorns for Java 1.21.1, with Paper and Fabric builds
- [Rasengan](https://github.com/TrishaAdio/Rasengan): server-authoritative charged energy sphere with a power-bar HUD
- [mc-builder-bots](https://github.com/TrishaAdio/Builder): a swarm of bots that builds the schematics you upload through Telegram

**Desktop & web**
- [CrystalChess](https://github.com/TrishaAdio/ChessSrc): glassy Windows chess client with Stockfish analysis, built on Tauri 2 and React 19
- [RuthlessChess](https://github.com/TrishaAdio/lola): full-strength Stockfish NNUE in the browser that never offers a draw
- [GlassPrint](https://github.com/TrishaAdio/printer): batch printing companion for Windows with a translucent glass UI
- [TileCraft](https://github.com/TrishaAdio/halftone): splits one image into paper tiles for a wall-sized poster, entirely in the browser
- [গ্যাসের অদৃশ্য জগৎ](https://github.com/TrishaAdio/gas): 3D, scroll-driven Bangla lessons on the gas laws for classes 8 to 12

**Tools, AI & infra**
- [kalam](https://github.com/TrishaAdio/illustrations): turns photos into pen-and-ink plates in the style of Satyajit Ray's illustrations
- [Shift](https://github.com/TrishaAdio/VpsShifter): moves bots, sites, APIs and databases to a new VPS, and rolls back if anything fails
- [kiro-runner](https://github.com/TrishaAdio/vpsmcp): config-driven runner that lets an AI agent use your VPS for installs, tests and builds
- [GitHub MCP](https://github.com/TrishaAdio/Github-Power): MCP server that lets an AI push code and open PRs while your token stays local
- [RioApis](https://github.com/TrishaAdio/api): OpenAI-compatible API on top of the Kiro CLI, with API keys and spend tracking
- [TrishaOS](https://github.com/TrishaAdio/TrishaOs): Yor Forger themed environment layer for Ubuntu 24.04
- [Anime Details API](https://github.com/TrishaAdio/anime): everything about an anime in one call, from open data sources

</details>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/title-stats-dark.svg">
  <img src="assets/title-stats-light.svg" width="100%" alt="04 / Stats: The aura, in numbers.">
</picture>

<p align="center">
  <img src="https://raw.githubusercontent.com/TrishaAdio/TrishaAdio/output/stats.svg" width="100%" alt="GitHub stats for @TrishaAdio: contributions, streaks, active days, top languages and a weekly contribution chart, rebuilt twice a day.">
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/TrishaAdio/TrishaAdio/output/github-contribution-grid-snake-dark.svg">
  <img src="https://raw.githubusercontent.com/TrishaAdio/TrishaAdio/output/github-contribution-grid-snake.svg" width="100%" alt="A snake eating the contribution graph">
</picture>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/title-connect-dark.svg">
  <img src="assets/title-connect-light.svg" width="100%" alt="05 / Say hi: Let's build something.">
</picture>

Telegram is the fastest way to reach me.

<p align="center">
  <a href="https://t.me/TrishaAdio"><img src="https://img.shields.io/badge/Message_me_on_Telegram-22d3ee?style=for-the-badge&logo=telegram&logoColor=white" alt="Message me on Telegram"></a>
</p>

<p align="center">
  <img src="assets/footer.svg" width="100%" alt="A ghost waves goodbye. Thanks for stopping by, see you in the commits.">
</p>
