const store = require('store')
const readline = require('readline');
const Kilt = require("@kiltprotocol/sdk-js")

storage = {
    claimers: "Claimer",
    attesters: "Attester",
    claims: "Claim"
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const commands = {
    help: help,
    commands: (depth) => listObj(commands, depth, depth),
    Claimer: {
        create: () => CreateIdentety(storage.claimers),
        remove: () => removeIdentety(storage.claimers),
        list: name => console.log(listItems(storage.claimers, name, claimer => claimer.name))
    },
    Attester: {
        create: () => CreateIdentety(storage.attesters),
        remove: () => removeIdentety(storage.attesters),
        list: name => console.log(listItems(storage.attesters, name, attester => attester.name))
    },
    Claim: {
        create: (claimerName) => CreateClaim(storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
        remove: () => removeClaim(storage.claims),
        list: name => console.log(listItems(storage.claims, name, claim => getClaimContents(claim).name)),
        listc: name => console.log(listItems(storage.claims, name, claim => getClaimContents(claim).name).map(getClaimContents))
    }

}



rl.on('line', (input) => {
    var args = input.split(" ")
    rl.pause()
    try {
        var command = commands
        while (typeof command !== "function") {
            command = command[args.shift()]
        }
        console.log("")
        command(...args)
    } catch (e) {
        console.log(e)
    } finally {
        rl.resume()
    }
});

rl.on('close', () => {
    console.log("Localy stored data:")
    store.each(function (value, key) {
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
        if (depth > 1) {
            listObj(obj[item], depth - 1, max_depth)
        }
    }

}

function CreateIdentety(storageLocation) {

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
            console.log(storageLocation + " created with name '" + identity.name + "' and mnemonic '" + identity.mnemonic + "'")

        } catch (e) {
            console.log(e) //"Invalid Mnemonic make sure it made up of 12 words")
        }
    });
}

function removeIdentety(storageLocation) {

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

function listItems(storageLocation, name, getName) {
    const items = store.get(storageLocation)
    var output = []
    for (var i in items) {
        if (name === getName(items[i]) || "$" + i.toString() === name || name === "*") {
            output.push(items[i])
        }
    }
    return output
}

function getClaimContents(claim) {
    if (claim.attestation) {
        return claim.request.claim.contents
    } else {
        return claim.claim.contents
    }
}

function CreateClaim(storageLocation, claimerDetails) {
    rl.question('Enter name and age?', (answer) => {
        var inputs = answer.split(" ")
        var data = {
            name: inputs.shift(),
            age: parseInt(inputs.shift())
        }

        const ctype = require('./ctype.json') // load ctype
        // check claimer was found
        if (claimerDetails == null) {
            console.log("No such claimer exists")
            return
        }

        const claimer = Kilt.Identity.buildFromMnemonic(claimerDetails.mnemonic)
        // create the claim
        const claim = Kilt.Claim.fromCTypeAndClaimContents(
            ctype,
            data,
            claimer.address,
            null
        );
        // format for attestation request
        const requestForAttestation = Kilt.RequestForAttestation.fromClaimAndIdentity(
            claim,
            claimer,
            []
        );
        // save claim localy
        var claims = store.get(storageLocation)
        if (claims == null) {
            claims = []
        }
        claims.push(requestForAttestation)

        store.set(storageLocation, claims)

        console.log(storageLocation + " created with name '" + data.name + "' and age '" + data.age + "'")
    });
}

function removeClaim(storageLocation) {

    rl.question('Enter name : ', (name) => {
        var claims = store.get(storageLocation)
        for (var i = 0; i < claims.length; i++) {
            var contents = getClaimContents(claims[i])
            if (name === contents.name) {
                console.log(storageLocation + " removed with name '" + contents.name + "' and age '" + contents.age + "'")
                claims.splice(i, 1)
                store.set(storageLocation, claims)
                break
            }
        }
    });
}