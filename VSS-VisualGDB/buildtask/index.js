'use strict';

const path = require('path');
const tl = require('vsts-task-lib/task');
const tr = require('vsts-task-lib/toolrunner');

const buildFolder = tl.getVariable('System.DefaultWorkingDirectory');
const allFiles = tl.find(buildFolder);
const settingsFilesMasks = tl.getInput("SettingsFileMask");
const cfgName = tl.getInput("ConfigName");
const extraArgs = tl.getInput("ExtraArgs");
const teamSettingsFolder = tl.getInput("TeamSettingsFolder");

const matchingFiles = tl.match(allFiles, settingsFilesMasks.split(';'), buildFolder);

const vgdbDir = process.env["VISUALGDB_DIR"];
if (vgdbDir == null) {
    tl.error("%VISUALGDB_DIR% is undefined. Please define it via System Environment variables.");
    return 1;
}

var index = 0;

if (!matchingFiles.length) {
    tl.error("No files match " + settingsFilesMasks + ". Please review your build settings.");
    return 1;
}

function StartNextJob() {
    if (index >= matchingFiles.length)
        return;

    const fn = matchingFiles[index++];

    console.log('Building ' + fn + '...');
    var tool = tl.tool(vgdbDir + '\\VisualGDB.exe').arg("/build").arg(fn);
    if (cfgName)
        tool = tool.arg("/config:" + cfgName);

    if (extraArgs) {
        var args = extraArgs.split(' ');
        for (var i = 0; i < args.length; i++)
            tool = tool.arg(args[i]);
    }

    tool.exec().then(function (code) {
        if (code != 0) {
            rl.error("Failed to build " + matchingFiles[i]);
            process.exit(1);
        }
        StartNextJob();
    }).fail(function (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    });
}

if (teamSettingsFolder) {
    var tool = tl.tool(vgdbDir + '\\VisualGDB.exe').arg("/teamsync:").arg(teamSettingsFolder);

    tool.exec().then(function (code) {
        if (code != 0) {
            rl.error("Failed to synchronize team settings");
            process.exit(1);
        }
        StartNextJob();
    }).fail(function (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    });
}
else {
    StartNextJob();
}