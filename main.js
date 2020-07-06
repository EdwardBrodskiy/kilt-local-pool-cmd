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
        create: claimerName => CreateClaim(storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
        remove: () => removeClaim(storage.claims),
        attest: attesterName => attestClaim(storage.claims, listItems(storage.attesters, attesterName, attester => attester.name)[0]),
        verify: claimerName => verifyClaim(storage.claims, listItems(storage.claimers, claimerName, claimer => claimer.name)[0]),
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
    rl.question('Enter claim name : ', (name) => {
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

function attestClaim(storageLocation, attesterDetails) {
    rl.question('Enter claim name : ', (name) => {
        var claims = store.get(storageLocation)
        var data, index = null
        for (var i = 0; i < claims.length; i++) {
            var contents = getClaimContents(claims[i])
            if (name === contents.name) {
                data = claims[i]
                index = i
                break
            }
        }

        // setup attester
        var attesterMnemonic = null
        try {
            attesterMnemonic = attesterDetails.mnemonic
        } catch (e) {
            console.log("No Attester exists")
            return
        }
        const attester = Kilt.Identity.buildFromMnemonic(attesterMnemonic)

        const requestForAttestation = Kilt.RequestForAttestation.fromRequest(
            data
        );

        // Validate
        if (!requestForAttestation.verifyData()) {
            console.log("Invalid Data")
            return
        }
        if (!requestForAttestation.verifySignature()) {
            console.log("Invalid Signature")
            return
        }

        // build the Attestation object
        const attestation = Kilt.Attestation.fromRequestAndPublicIdentity(
            requestForAttestation,
            attester.getPublicIdentity()
        );

        // store on block chain

        Kilt.default.connect('wss://full-nodes.kilt.io:9944')


        attestation.store(attester).then(() => {
            // create the attestedclaim
            const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
                requestForAttestation,
                attestation
            );
            // store it localy
            var claims = store.get(storageLocation)
            claims[index] = attestedClaim
            store.set(storageLocation, claims)


        }).catch(e => {
            console.log(e)
        }).finally(() => {
            Kilt.default.disconnect()
        })
    });
}

function verifyClaim(storageLocation, claimer){
    rl.question('Enter claim name : ', (name) => {
        var claims = store.get(storageLocation)
        var claim = null
        for (var i = 0; i < claims.length; i++) {
            var contents = getClaimContents(claims[i])
            if (name === contents.name) {
                claim = claims[i]
                break
            }
        }
        const result = Verifier.sendForVerification(claim, nonce => handleNonceSigning(claimer.mnemonic, nonce))
        switch (result) {
            case Verifier.SUCCESS:
                console.log("Claim Accepted by Verifier")
                break
            case Verifier.CLAIMER_NOT_OWNER:
                console.log("Claim does not belong to Claimer")
                break
            case Verifier.CLAIM_INVALID:
                console.log("Claim denied by Verifier")
                break
            case Verifier.NOT_ACCEPTED_CLAIM_FORMAT:
                console.log("Invalid Claim check if it is attested")
                break
            default:
                console.log("Unkown result")
        }
    })
}

function handleNonceSigning(claimerMnemonic, nonce) { // sign the nonce and send of the data to be verified

    const claimer = Kilt.Identity.buildFromMnemonic(claimerMnemonic)
    // sign the nonce as the claimer with your private identity
    const signedNonce = claimer.signStr(nonce)

    return signedNonce
}

class Verifier {
    static SUCCESS = 0
    static CLAIMER_NOT_OWNER = 1
    static CLAIM_INVALID = 2
    static NOT_ACCEPTED_CLAIM_FORMAT


    static sendForVerification(attestedClaimStruct, nonceSigner) {
        const Kilt = require("@kiltprotocol/sdk-js")

        const uuid = require("uuid")

        // generate nonce
        const nonce = uuid.v4()
        // get Claimer to sign nonce
        const signedNonce = nonceSigner(nonce)

        // check the claimer is the owner of the Claim
        var isSenderOwner = null
        try {
            isSenderOwner = Kilt.Crypto.verify(nonce, signedNonce, attestedClaimStruct.request.claim.owner)
        } catch (e) { // catch if the form is not properly formated
            return this.NOT_ACCEPTED_CLAIM_FORMAT
        }

        if (!isSenderOwner) {
            return this.CLAIMER_NOT_OWNER
        }

        // proceed with verifying the attestedClaim itself
        const attestedClaim = Kilt.AttestedClaim.fromAttestedClaim(attestedClaimStruct);

        // connect to the KILT blockchain
        Kilt.default.connect('wss://full-nodes.kilt.io:9944')

        // verify:
        // - verify that the data is valid for the given CTYPE;
        // - verify on-chain that the attestation hash is present and that the attestation is not revoked.
        const isValid = attestedClaim.verify()

        Kilt.default.disconnect()

        if (isValid) {
            return this.SUCCESS
        }
        return this.CLAIM_INVALID



    }
}
