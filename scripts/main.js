const moduleID = 'health-monitor';

const chatMessageMap = {
    "hp-plus": {
        color: "#06a406",
        verb: "heals",
        noun: "HP"
    },
    "hp-minus": {
        color: "#c50d19",
        verb: "takes",
        noun: "damage"
    },
    "max-plus": {
        color: "#0d58c5",
        verb: "gains",
        noun: "max HP"
    },
    "max-minus": {
        color: "#ff8c25",
        verb: "loses",
        noun: "max HP"
    },
    "temp-plus": {
        color: "#79a3e1",
        verb: "gains",
        noun: "temp HP"
    }
};


const lg = x => console.log(x);


Hooks.once('init', () => {
    // Register module settings.
    game.settings.register(moduleID, 'useTokenName', {
        name: game.i18n.localize('healthMonitor.settings.useTokenName.name'),
        hint: game.i18n.localize('healthMonitor.settings.useTokenName.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'hideNPCs', {
        name: game.i18n.localize('healthMonitor.settings.hideNPCs.name'),
        hint: game.i18n.localize('healthMonitor.settings.hideNPCs.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'hideNPCname', {
        name: game.i18n.localize('healthMonitor.settings.hideNPCname.name'),
        hint: game.i18n.localize('healthMonitor.settings.hideNPCname.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'replacementName', {
        name: game.i18n.localize('healthMonitor.settings.replacementName.name'),
        hint: game.i18n.localize('healthMonitor.settings.replacementName.hint'),
        scope: 'world',
        type: String,
        default: '???',
        config: true
    });
    game.settings.register(moduleID, 'showGMonly', {
        name: game.i18n.localize('healthMonitor.settings.showGMonly.name'),
        hint: game.i18n.localize('healthMonitor.settings.showGMonly.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'showToggle', {
        name: game.i18n.localize('healthMonitor.settings.showToggle.name'),
        hint: game.i18n.localize('healthMonitor.settings.showToggle.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true,
        onChange: async () => {
            if (!game.user.isGM) return;

            await game.settings.set(moduleID, 'hmToggle', true);
            ui.controls.initialize();
        }
    });
    game.settings.register(moduleID, 'showRes', {
        name: game.i18n.localize('healthMonitor.settings.showRes.name'),
        hint: game.i18n.localize('healthMonitor.settings.showRes.hint'),
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'trackMax', {
        name: game.i18n.localize('healthMonitor.settings.trackMax.name'),
        hint: '',
        scope: 'world',
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register(moduleID, 'trashIcon', {
        name: game.i18n.localize('healthMonitor.settings.trashIcon.name'),
        hint: '',
        scope: 'world',
        type: Boolean,
        default: false,
        config: true,
        onChange: () => window.location.reload()
    });
    game.settings.register(moduleID, 'hmToggle', {
        name: 'Toggle Health Monitor',
        hint: '',
        scope: 'world',
        type: Boolean,
        default: true,
        config: false
    });

    // Register socket handler.
    game.socket.on(`module.${moduleID}`, data => {
        if (game.user.id !== data.GM) return;

        const { content, whisper } = data.messageData;
        ChatMessage.create({
            content,
            whisper
        });
    });
});


// Add control toggle to enable/disable Health Monitor
Hooks.on("getSceneControlButtons", controls => {
    if (!game.settings.get(moduleID, "showToggle")) return;

    const bar = controls.find(c => c.name === "token");
    bar.tools.push({
        name: "Health Monitor",
        title: game.i18n.localize("healthMonitor.control.title"),
        icon: "fa fa-heartbeat",
        visible: game.user.isGM,
        toggle: true,
        active: game.settings.get(moduleID, "hmToggle"),
        onClick: async toggled => await game.settings.set(moduleID, "hmToggle", toggled)
    });
});

 // Apply custom CSS to Health Monitor chat messages
 Hooks.on("renderChatMessage", (app, [html], data) => {
    const hmMessage = html.querySelector(`.hm-message`);
    if (!hmMessage) return;

    const whisperTo = html.querySelector('span.whisper-to');
    whisperTo?.remove();

    const key = hmMessage.classList[1];
    const { color } = chatMessageMap[key];
    html.style.cssText = `
        background: ${color};
        text-shadow: -1px -1px 0 #000 , 1px -1px 0 #000 , -1px 1px 0 #000 , 1px 1px 0 #000;
        color: white;
        text-align: center;
        font-size: 12px;
        margin: 2px;
        padding: 2px;
        border: 2px solid #191813d6
    `;
    html.querySelector('.message-sender').innerText = '';
    html.querySelector('.message-metadata').style.display = 'none';

    if (game.settings.get(moduleID, "trashIcon") && game.user.isGM) {
        const hmMessageDiv = html.querySelector(`div.hm-message`);
        hmMessageDiv.style.position = 'relative';

        const trashIcon = document.createElement('span');
        trashIcon.style.position = 'absolute';
        trashIcon.style.left = '95%';
        trashIcon.innerHTML = `
            <a class="button message-delete"><i class="fas fa-trash"></i></a>
        `;
        hmMessageDiv.querySelector(`span`).after(trashIcon);
    }
});

Hooks.on('preUpdateActor', async (actor, diff, options, userID) => {
    if (!game.settings.get(moduleID, 'hmToggle')) return;
    
    // Calcuate HP deltas.
    const newHP = foundry.utils.getProperty(diff, 'system.attributes.hp');
    if (!newHP) return;

    const oldHP = actor.system.attributes.hp;
    const deltas = {};
    if ('value' in newHP) deltas.hp = newHP.value - oldHP.value;
    if ('max' in newHP) deltas.max = newHP.max - oldHP.max
    if ('temp' in newHP) deltas.temp = newHP.temp - oldHP.temp;   
    if (deltas.temp < 0) deltas.hp = (deltas.hp || 0) + deltas.temp;

    // Prepare common chat message data.
    const whisper =
        game.settings.get(moduleID, "showGMonly")
        || (game.settings.get(moduleID, "hideNPCs") && actor.type === "npc")
            ? game.users.filter(u => u.isGM).map(u => u.id)
            : [];
    const characterName = game.settings.get(moduleID, 'useTokenName')
        ? actor.token?.name || actor.getActiveTokens()[0]?.document.name || actor.name
        : actor.name ;
    const showRes = game.settings.get(moduleID, 'showRes');
    let immunity, resistance, vulnerability;
    if (showRes) {
        immunity = actor.system.traits.di.value.join(", ");
        resistance = actor.system.traits.dr.value.join(", ");
        vulnerability = actor.system.traits.dv.value.join(", ");
    }

    // For each HP delta, create a chat message.
    for (const [k, delta] of Object.entries(deltas)) {
        const chatMessageMapKey = `${k}-${delta > 0 ? 'plus' : 'minus'}`;
        if (chatMessageMapKey === 'temp-minus') continue;

        const chatMessageValue = chatMessageMap[chatMessageMapKey];
        const { verb, noun } = chatMessageValue;
        const templateData = {
            key: chatMessageMapKey,
            characterName,
            verb,
            amount: Math.abs(delta),
            noun,
            showRes,
            immunity,
            resistance,
            vulnerability
        };
        const content = await renderTemplate(`modules/${moduleID}/templates/chat-message.hbs`, templateData);

        if (game.user.isGM) {
            await ChatMessage.create({
                content,
                whisper
            });
        } else {
            game.socket.emit(`module.${moduleID}`, {
                GM: game.users.find(u => u.isGM && u.active).id,
                messageData: {
                    content,
                    whisper
                }
            });
        }
    }
});
