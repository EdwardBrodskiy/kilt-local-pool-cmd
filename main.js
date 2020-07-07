const store = require('store')
const readline = require('readline');
const Kilt = require("@kiltprotocol/sdk-js")
const Identities = require("./Identities.js")
const Claims = require("./Claims.js");
const { constants } = require('buffer');

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
    help: () => help(commands),
    commands: (depth) => listObj(commands, depth, depth),
    create: {
        claimer: () => Identities.createIdentity(rl, storage.claimers),
        attester: () => Identities.createIdentity(rl, storage.attesters),
        claim: claimerName => Claims.createClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
    },
    remove: {
        claimer: () => Identities.removeIdentity(rl, storage.claimers),
        attester: () => Identities.removeIdentity(rl, storage.attesters),
        claim: () => Claims.removeClaim(rl, storage.claims)
    },
    list: {
        claimer: name => console.log(listItems(storage.claimers, name, claimer => claimer.name)),
        attester: name => console.log(listItems(storage.attesters, name, attester => attester.name)),
        claim: name => console.log(listItems(storage.claims, name, claim => Claims.getClaimContents(claim).name))
    },
    listc: {
        claim: name => console.log(listItems(storage.claims, name, claim => Claims.getClaimContents(claim).name).map(Claims.getClaimContents))
    },
    attest: attesterName => Claims.attestClaim(rl, storage.claims, listItems(storage.attesters, attesterName, attester => attester.name)[0]),
    verify: claimerName => Claims.verifyClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
    addDid: () => Identities.createDid(rl, storage.claimers)
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
        console.log("Invalid command type 'help' for more info")
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


function help(commands) {
    console.log("These are the possible commands chain them to call on functions:")
    listObj(commands, 2, 2)
    console.log("Example: create claimer")
}

function listObj(obj, depth, max_depth) {
    for (var item in obj) {
        console.log(item.padStart((max_depth - depth) * 3 + item.length, '   '))
        if (depth > 1) {
            listObj(obj[item], depth - 1, max_depth)
        }
    }

}

function listItems(storageLocation, name, getName) {
    const items = store.get(storageLocation)
    var output = []
    for (var i in items) {
        if (name === getName(items[i]) || "$" + i.toString() === name || name === "*") {
            output.push(items[i])
        }
    }

    if (output.length === 0) {
        console.log("Make sure you enter a valid " + storageLocation + "'s name or id on command call.")
    }
    return output
}



