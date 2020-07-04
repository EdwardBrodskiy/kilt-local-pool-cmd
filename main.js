const store = require('store')
const readline = require('readline');
const Kilt = require("@kiltprotocol/sdk-js")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const commands = {
    help: help,
    list: () => listObj(commands, 2, 2),
    Claimer: {
        create: () => CreateIdentety("User"),
        remove: () => removeIdentety("User")
    },
    Attester: {
        create: () => CreateIdentety("Attester"),
        remove: () => removeIdentety("Attester")
    },
    Claim: {
        create: null,
        remove: null
    }

}

rl.on('line', (input) => {
    var args = input.split(" ")
    rl.pause()
    try {
        var command = commands
        while (args.length !== 0) {
            command = command[args.shift()]
        }
        console.log("")
        command()
    } catch (e) {
        console.log(e)
    } finally {
        rl.resume()
    }
});

rl.on('close', () => {
    console.log("Localy stored data:")
    store.each(function(value, key) {
        console.log(key, '==', value)
    })
})


function help() {
    console.log("These are the possible commands chain them to call on functions:")
    listObj(commands, 2, 2)
    console.log("Example: Claimer create")
}

function listObj(obj, depth, max_depth) {
    for (var item in obj) {
        console.log(item.padStart((max_depth - depth) * 3 + item.length, '   '))
        if (depth !== 1) {
            listObj(obj[item], depth - 1, max_depth)
        }
    }

}

function CreateIdentety(type) {
    const storageLocation = type + "-ids"

    rl.question('Enter name and Mnemonic?(leave empty for auto generation)', (answer) => {
        var inputs = answer.split(" ")
        var identity = {
            name: inputs.shift(),
            mnemonic: inputs.join(" ")
        }

        if (identity.mnemonic === "") {
            identity.mnemonic = Kilt.Identity.generateMnemonic()
        }

        try {
            Kilt.Identity.buildFromMnemonic(identity.mnemonic)
            var ids = store.get(storageLocation)
            if (ids == null) {
                ids = []
            }
            ids.push(identity)
            store.set(storageLocation, ids)
            console.log(type + " created with name '" + identity.name + "' and mnemonic '" + identity.mnemonic + "'")

        } catch (err) {
            console.log("Invalid Mnemonic make sure it made up of 12 words")
        }
    });
}

function removeIdentety(type) {
    const storageLocation = type + "-ids"
    
    rl.question('Enter name : ', (name) => {
        var ids = store.get(storageLocation)
        for(var i = 0; i < ids.length;i++){
            if(name === ids[i].name){
                console.log(type + " removed with name '" + ids[i].name + "' and mnemonic '" + ids[i].mnemonic + "'")
                ids.splice(i, 1)
                store.set(storageLocation, ids)
                break
            }
        }
    });
}