![All Downloads](https://img.shields.io/github/downloads/jessev14/health-monitor/total?style=for-the-badge)

![Latest Release Download Count](https://img.shields.io/github/downloads/jessev14/health-monitor/latest/EI.zip)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fhealth-monitor&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=health-monitor)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/jessev14)

# Health Monitor
Health Monitor creates a simple alert in chat when an actor's HP is changed. The module includes several settings to hide/show certain alerts to players and to hide the name of NPCs.

<img src="/img/health-monitor.png" height="350"/>

# Settings

## Use Token Name
Alerts will use the token name instead of the name on the actor's character sheet. For linked actors, the prototype token name will be used.

## Hide NPC Health Log from Players
Changes to NPC HP will not be displayed to players. GM users will still see these alerts and can reveal them to the players using the right-click context menu.

## Hide NPC Name
Instead of displaying the NPC's name, replacement text will be displayed in the alert. The text to be used as a replacement can be set in the next module setting.

## Hidden NPC Name Replacement
The text entered in this module setting will be used to replace NPC names if the above setting is enabled.

NOTE: The above three settings will not apply for systems other than dnd5e. Support can be extended to other systems. Please submit an issue indicating your system and the type of actor the system uses that would be analogous to dnd5e NPCs.

## Display Health Monitor to GM Users Only
All alerts (for PCs and NPCs) will be hidden from non-GM users.

## Show Health Monitor Toggle
For GM users, a new control button will be added to the token control button. Toggling this button off will prevent alerts from being created (for GMs and players), until the button is toggled back on.

## Show Damage Immunities, Resistances, and Vulnerabilities
HP alerts will also display the actor's damage immunities, resistances, and vulnerabilities.

NOTE: This feature is purely visual. An automation module will still be required to automatically apply immunities/resistances/vulnerabilities.

## Show Changes to Max HP / Temp Max HP
Increases in an actor's max HP/temp max HP will be shown in blue alerts. Decreases will be shown in orange alerts. This setting is enabled by default.

NOTE: Depending on how different systems implement temp HP, this feature may not function properly for temp Max HP.

# Technical Notes
A callback is registered to the `preUpdateActor` hook. When a change in HP is detected, that data is used to create a chat message logging the value of the change.

A second callback is registered to the `renderChatMessage` hook to apply custom styling to chat messages created by the above callback.
