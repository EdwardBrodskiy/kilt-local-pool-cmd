const Kilt = require("@kiltprotocol/sdk-js")
const readline = require("readline")
const store = require('store')

module.exports = {
    createIdentety: function (rl, storageLocation) {
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
                identity.address = Kilt.Identity.buildFromMnemonic(identity.mnemonic).address
                var ids = store.get(storageLocation)
                if (ids == null) {
                    ids = []
                }
                ids.push(identity)
                store.set(storageLocation, ids)
                console.log(storageLocation + " created with name '" + identity.name + "' and mnemonic '" + identity.mnemonic + "'")

            } catch (e) {
                console.log(e) //"Invalid Mnemonic make sure it made up of 12 words")
            }
        });
    },
    removeIdentety: function (rl, storageLocation) {

        rl.question('Enter name : ', (name) => {
            var ids = store.get(storageLocation)
            for (var i = 0; i < ids.length; i++) {
                if (name === ids[i].name) {
                    console.log(storageLocation + " removed with name '" + ids[i].name + "' and mnemonic '" + ids[i].mnemonic + "'")
                    ids.splice(i, 1)
                    store.set(storageLocation, ids)
                    break
                }
            }
        });
    }
}


