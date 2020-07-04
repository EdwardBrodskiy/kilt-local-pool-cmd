const Kilt = require("@kiltprotocol/sdk-js")
const readline = require("readline")
const store = require('store')


function CreateIdentety(type) {
    const storageLocation = type + "-ids"
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const nameAndMnemonic = ""
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


        } catch (err) {
            alert("Invalid Mnemonic make sure it made up of 12 words")
        }

        console.log("");

        rl.close();
    });
}


