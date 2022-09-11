const moduleName = "health-monitor";
// Background colors for: takes, heals, loses, gains
const backgroundColors = ["#c50d19", "#06a406", "#ff8c25", "#0d58c5"];
let trashIconSetting;


Hooks.once("init", () => {
    console.log(`${moduleName} | Initializing ${moduleName}`);

    // Open module API
    window.HealthMonitor = HealthMonitor;

    // Register module settings
    window.HealthMonitor.registerSettings();

    // Determine trashIcon module setting state
    trashIconSetting = game.settings.get(moduleName, "trashIcon");

    // Register "init" hooks
    window.HealthMonitor.registerInitHooks();

    // Register socket
    window.HealthMonitor.registerSocket();
});

Hooks.once("ready", () => {
    // Register "ready" hooks
    window.HealthMonitor.registerReadyHooks();
});


class HealthMonitor {
    // Settings
    static registerSettings() {
        game.settings.register(moduleName, "useTokenName", {
            name: game.i18n.localize("healthMonitor.settings.useTokenName.name"),
            hint: game.i18n.localize("healthMonitor.settings.useTokenName.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "hideNPCs", {
            name: game.i18n.localize("healthMonitor.settings.hideNPCs.name"),
            hint: game.i18n.localize("healthMonitor.settings.hideNPCs.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "hideNPCname", {
            name: game.i18n.localize("healthMonitor.settings.hideNPCname.name"),
            hint: game.i18n.localize("healthMonitor.settings.hideNPCname.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "replacementName", {
            name: game.i18n.localize("healthMonitor.settings.replacementName.name"),
            hint: game.i18n.localize("healthMonitor.settings.replacementName.hint"),
            scope: "world",
            type: String,
            default: "???",
            config: true
        });
        game.settings.register(moduleName, "showGMonly", {
            name: game.i18n.localize("healthMonitor.settings.showGMonly.name"),
            hint: game.i18n.localize("healthMonitor.settings.showGMonly.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "showToggle", {
            name: game.i18n.localize("healthMonitor.settings.showToggle.name"),
            hint: game.i18n.localize("healthMonitor.settings.showToggle.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true,
            onChange: async () => {
                if (!game.user.isGM) return;

                await game.settings.set(moduleName, "hmToggle", true);
                ui.controls.initialize();
            }
        });
        game.settings.register(moduleName, "showRes", {
            name: game.i18n.localize("healthMonitor.settings.showRes.name"),
            hint: game.i18n.localize("healthMonitor.settings.showRes.hint"),
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "trackMax", {
            name: game.i18n.localize("healthMonitor.settings.trackMax.name"),
            hint: "",
            scope: "world",
            type: Boolean,
            default: false,
            config: true
        });
        game.settings.register(moduleName, "trashIcon", {
            name: game.i18n.localize("healthMonitor.settings.trashIcon.name"),
            hint: "",
            scope: "world",
            type: Boolean,
            default: false,
            config: true,
            onChange: () => window.location.reload()
        });

        game.settings.register(moduleName, "hmToggle", {
            name: "Toggle Health Monitor",
            hint: "",
            scope: "world",
            type: Boolean,
            default: true,
            config: false
        });
    }

    // Hooks
    static registerInitHooks() {
        // Add control toggle to enable/disable Health Monitor
        if (game.settings.get(moduleName, "showToggle")) {
            Hooks.on("getSceneControlButtons", controls => {

                const bar = controls.find(c => c.name === "token");
                bar.tools.push({
                    name: "Health Monitor",
                    title: game.i18n.localize("healthMonitor.control.title"),
                    icon: "fa fa-heartbeat",
                    visible: game.user.isGM,
                    toggle: true,
                    active: game.settings.get(moduleName, "hmToggle"),
                    onClick: async toggled => await game.settings.set(moduleName, "hmToggle", toggled)
                });
            });
        }

        // Apply custom CSS to Health Monitor chat messages
        Hooks.on("renderChatMessage", (app, html, data) => {
            const hmMessage = html.find(`.hm-message`);
            if (!hmMessage.length) return;

            const isHeal = hmMessage.hasClass("heals") ? 1 : 0;
            const isMax = hmMessage.hasClass("max") ? 2 : 0;
            const background = backgroundColors[isHeal + isMax]; // Clever use of math to get the correct background color based on HP update type; demux 2-to-4 converter
            html.css("background", background);
            html.css("text-shadow", "-1px -1px 0 #000 , 1px -1px 0 #000 , -1px 1px 0 #000 , 1px 1px 0 #000");
            html.css("color", "white");
            html.css("text-align", "center");
            html.css("font-size", "12px");
            html.css("margin", "2px");
            html.css("padding", "2px");
            html.css("border", "2px solid #191813d6");
            html.find(".message-sender").text("");
            html.find(".message-metadata")[0].style.display = "none";

            // Optionally add trash icon
            if (trashIconSetting && game.user.isGM) {
                const hmMessageDiv = html.find(`div.hm-message`);
                hmMessageDiv.css("position", "relative");
                $(hmMessageDiv).find(`span`).after(`<span><a class="button message-delete"><i class="fas fa-trash"></i></a></span>`);

                html.find(`a.message-delete`).closest(`span`).css("position", "absolute");
                html.find(`a.message-delete`).closest(`span`).css("left", "95%");
            }
        });
    }

    static registerReadyHooks() {
        // When actor HP is updated, create chat message logging HP change
        Hooks.on("preUpdateActor", async (actor, diff, options, userID) => {
            // If Health Monitor disabled via control toggle, return
            if (!game.settings.get(moduleName, "hmToggle")) return;

            // If no HP change in update, return
            const newHP = getProperty(diff, "data.attributes.hp");
            if (!newHP) return;

            const oldHP = getProperty(actor.data, "data.attributes.hp");

            // Calculate tempHP and HP deltas
            let tempDelta, valueDelta;
            if (Number.isNumeric(newHP.temp)) tempDelta = newHP.temp - oldHP.temp;
            if (Number.isNumeric(newHP.value)) valueDelta = newHP.value - oldHP.value;

            // Calcluate tempHP max and HP max deltas
            let tempMaxDelta, maxDelta;
            if (Number.isNumeric(newHP.tempmax)) tempMaxDelta = newHP.tempmax - oldHP.tempmax;
            if (Number.isNumeric(newHP.max)) maxDelta = newHP.max - oldHP.max;

            // Sum deltas
            const mDelta = (tempMaxDelta || 0) + (maxDelta || 0);
            const delta = (tempDelta || 0) + (valueDelta || 0);

            // Prepare common template data
            const hideName = actor.type === "npc" && game.settings.get(moduleName, "hideNPCname");
            const replacementName = game.settings.get(moduleName, "replacementName");
            const useTokenName = game.settings.get(moduleName, "useTokenName");
            const characterName = hideName ?
                replacementName : useTokenName ?
                    actor.token?.name || actor.data.token.name : actor.name;

            const showRes = game.settings.get(moduleName, "showRes");
            let immunity, resistance, vulnerability;
            if (showRes) {
                immunity = actor.data.data.traits.di.value.join(", ");
                resistance = actor.data.data.traits.dr.value.join(", ");
                vulnerability = actor.data.data.traits.dv.value.join(", ");
            }

            // If "showGMonly" setting enabled or if "hideNPCs" setting enabled and actor is an NPC, whisper to GM users
            const whisper = game.settings.get(moduleName, "showGMonly") || (game.settings.get(moduleName, "hideNPCs") && actor.type === "npc") ?
                game.users.filter(u => u.isGM).map(u => u.id) : [];
        
            // For both deltas, create a chat message logging HP change
            const d = {
                max: mDelta,
                value: delta
            };
            for (const [k, v] of Object.entries(d)) {
                // If delta is null or 0, return
                if (!v) continue;

                // Don't log changes to max if module settings disabled
                if (k === "max" && !game.settings.get(moduleName, "trackMax")) return;

                // Prepare chat message content based on delta
                const isMax = k === "max";
                const isHeal = v > 0;
                let css = ``;
                isHeal ? css += `heals` : `takes`;
                if (isMax) css += ` max`;
                const healsTakes = isHeal ? game.i18n.localize("healthMonitor.chatMessage.heals") : game.i18n.localize("healthMonitor.chatMessage.takes");
                const gainsLoses = isHeal ? game.i18n.localize("healthMonitor.chatMessage.gains") : game.i18n.localize("healthMonitor.chatMessage.loses");
                const templateData = {
                    css,
                    damage: !isMax,
                    characterName,
                    healsTakes,
                    gainsLoses,
                    delta: Math.abs(v),
                    showRes,
                    immunity,
                    resistance,
                    vulnerability
                };
                const content = await renderTemplate(`modules/${moduleName}/templates/chat-message.hbs`, templateData);

                // preUpdateActor hook only fires on client that initiated the update
                if (game.user.isGM) {
                    // Create chat message
                    await ChatMessage.create({
                        content,
                        whisper
                    });
                } else {
                    // Send chat message data to GM client via socket
                    socket.emit(`module.${moduleName}`, {
                        GM: game.users.find(u => u.isGM && u.active).id,
                        messageData: {
                            content,
                            whisper
                        }
                    });
                }
            }
        });
    }

    // Socket
    static registerSocket() {
        game.socket.on(`module.${moduleName}`, data => {
            if (game.user.id !== data.GM) return;

            const { content, whisper } = data.messageData;
            ChatMessage.create({
                content,
                whisper
            });
        });
    }
}
