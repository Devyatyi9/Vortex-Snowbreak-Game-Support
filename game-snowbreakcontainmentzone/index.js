//Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, util } = require('vortex-api');

// Nexus Mods domain for the game. e.g. nexusmods.com/snowbreakcontainmentzone
const GAME_ID = 'snowbreakcontainmentzone';

//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '2668080';
let laucher_path = '';
const MOD_FILE_EXT = ".pak";

function main(context) {
    //This is the main function Vortex will run when detecting the game extension. 
    context.registerGame({
        id: GAME_ID,
        name: 'Snowbreak: Containment Zone',
        mergeMods: true,
        queryPath: findGame,
        supportedTools: [],
        queryModPath: () => 'Game/Content/Paks/~mods',
        logo: 'gameart.jpg',
        executable: () => 'Game/Binaries/Win64/Game.exe',
        requiredFiles: [
            'Game/Binaries/Win64/Game.exe'
        ],
        setup: prepareForModding,
        environment: {
            SteamAPPId: STEAMAPP_ID,
        },
        details: {
            steamAppId: STEAMAPP_ID
        },
    });
    context.registerInstaller('snowbreakcontainmentzone-mod', 25, testSupportedContent, installContent);
    return true;
}

function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
        .then(game => game.gamePath);
}

function prepareForModding(discovery) {
    return fs.ensureDirWritableAsync(path.join(discovery.path, 'Game', 'Content', 'Paks', '~mods'));
}

function testSupportedContent(files, gameId) {
    // Make sure we're able to support this mod.
    let supported = (gameId === GAME_ID) &&
        (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined);

    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

function installContent(files) {
    // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
    const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);

    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1)
        && (!file.endsWith(path.sep))));

    const instructions = filtered.map(file => {
        return {
            type: 'copy',
            source: file,
            destination: path.join(file.substr(idx)),
        };
    });

    return Promise.resolve({ instructions });
}

module.exports = {
    default: main,
};