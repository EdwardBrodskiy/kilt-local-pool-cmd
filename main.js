const store = require('store')
const readline = require('readline');
const Kilt = require("@kiltprotocol/sdk-js")
const Identeties = require("./Identeties.js")
const Claims = require("./Claims.js")

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
        create: () => Identeties.createIdentety(rl, storage.claimers),
        remove: () => Identeties.removeIdentety(rl, storage.claimers),
        addDid: () => Identeties.createDid(rl, storage.claimers),
        list: name => console.log(listItems(storage.claimers, name, claimer => claimer.name))
    },
    Attester: {
        create: () => Identeties.createIdentety(rl, storage.attesters),
        remove: () => Identeties.removeIdentety(rl, storage.attesters),
        list: name => console.log(listItems(storage.attesters, name, attester => attester.name))
    },
    Claim: {
        create: claimerName => Claims.createClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
        remove: () => Claims.removeClaim(rl, storage.claims),
        attest: attesterName => Claims.attestClaim(rl, storage.claims, listItems(storage.attesters, attesterName, attester => attester.name)[0]),
        verify: claimerName => Claims.verifyClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
        list: name => console.log(listItems(storage.claims, name, claim => Claims.getClaimContents(claim).name)),
        listc: name => console.log(listItems(storage.claims, name, claim => Claims.getClaimContents(claim).name).map(getClaimContents))
    }

}

const cmds = {
    help: help,
    commands: (depth) => listObj(cmds, depth, depth),
    create: {
        claimer: () => Identeties.createIdentety(rl, storage.claimers),
        attester: () => Identeties.createIdentety(rl, storage.attesters),
        claim: claimerName => Claims.createClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
    },
    remove: {
        claimer: () => Identeties.removeIdentety(rl, storage.claimers),
        attester: () => Identeties.removeIdentety(rl, storage.attesters),
        claim: () => Claims.removeClaim(rl, storage.claims)
    },
    list: {
        claimer: name => console.log(listItems(storage.claimers, name, claimer => claimer.name)),
        attester: name => console.log(listItems(storage.attesters, name, attester => attester.name)),
        claim: name => console.log(listItems(storage.claims, name, claim => Claims.getClaimContents(claim).name))
    },
    attest: attesterName => Claims.attestClaim(rl, storage.claims, listItems(storage.attesters, attesterName, attester => attester.name)[0]),
    verify: claimerName => Claims.verifyClaim(rl, storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
    addDid: () => Identeties.createDid(rl, storage.claimers)
}



rl.on('line', (input) => {
    var args = input.split(" ")
    rl.pause()
    try {
        var command = cmds
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



