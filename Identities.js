const Kilt = require("@kiltprotocol/sdk-js")
const readline = require("readline")
const store = require('store')

module.exports = {
    createIdentity: function (rl, storageLocation) { // create a new identity
        rl.question('Enter name and Mnemonic?(leave mnemonic empty for auto generation)', (answer) => {
            var inputs = answer.split(" ")
            var identity = {
                name: inputs.shift(),
                mnemonic: inputs.join(" ")
            }

            if(identity.name === ""){
                console.log("Please enter a name")
                return
            }

            if (identity.mnemonic === "") { // generate if not given
                identity.mnemonic = Kilt.Identity.generateMnemonic()
            }

            try {
                // try to build identity from mnemonic hance check if mnemonic is valid
                identity.address = Kilt.Identity.buildFromMnemonic(identity.mnemonic).address
                // store the new identity
                var ids = store.get(storageLocation)
                if (ids == null) {
                    ids = []
                }
                ids.push(identity)
                store.set(storageLocation, ids)
                console.log(storageLocation + " created with name '" + identity.name + "' and mnemonic '" + identity.mnemonic + "'")
            } catch (e) {
                console.log("Invalid Mnemonic make sure it is made up of 12 words")
            }
        });
    },
    removeIdentity: function (rl, storageLocation) { // removes the first identity from local storage with the specified name
        rl.question('Enter identity name : ', (name) => {
            var ids = store.get(storageLocation)
            for (var i = 0; i < ids.length; i++) {
                if (name === ids[i].name) {
                    console.log(storageLocation + " removed with name '" + ids[i].name + "' and mnemonic '" + ids[i].mnemonic + "'")
                    ids.splice(i, 1)
                    store.set(storageLocation, ids)
                    return
                }
            }
            console.log("No " + storageLocation + " found under the name of " + name)
        });
    },
    createDid: function (rl, storageLocation) {
        rl.question('Enter identity name : ', (name) => {
            var ids = store.get(storageLocation)
            for (var i = 0; i < ids.length; i++) {
                if (name === ids[i].name) {
                    // setup Claimer
                    const mnemonic = ids[i].mnemonic

                    const identity = Kilt.Identity.buildFromMnemonic(mnemonic)
                    // create did object
                    const did = Kilt.Did.fromIdentity(identity)

                    // add to blockchain
                    Kilt.default.connect('wss://full-nodes.kilt.io:9944')
                    did.store(identity).then(() =>{
                        // store did object 
                        ids[i]["did"] = did.createDefaultDidDocument()
                        store.set(storageLocation, ids)
                    }).catch( e => {
                        console.log(e)
                    }).finally (() =>{
                        Kilt.default.disconnect('wss://full-nodes.kilt.io:9944')
                    })
                    break
                }
            }
        });
    }
}


