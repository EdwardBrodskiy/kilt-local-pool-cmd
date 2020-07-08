const store = require('store')
const readline = require('readline');
const Kilt = require("@kiltprotocol/sdk-js")

module.exports = {
    getClaimContents: function (claim) {
        if (claim.attestation) {
            return claim.request.claim.contents
        } else {
            return claim.claim.contents
        }
    },
    createClaim: function(rl, storageLocation, claimerDetails) { // create new Claim
        // check claimer was found
        if (claimerDetails == null) {
            console.log("No such claimer exists")
            return
        }
        rl.question('Enter name and age?', (answer) => {
            var inputs = answer.split(" ")
            var data = {
                name: inputs.shift(),
                age: parseInt(inputs.shift())
            }
    
            const ctype = require('./ctype.json') // load ctype
            
    
            const claimer = Kilt.Identity.buildFromMnemonic(claimerDetails.mnemonic)
            // create the claim
            var claim
            try{
                claim = Kilt.Claim.fromCTypeAndClaimContents(
                    ctype,
                    data,
                    claimer.address,
                    null
                );
            }catch(e){
                console.log(e.message)
                return
            }
            
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
    },
    removeClaim: function(rl, storageLocation) { // removes the first claim from local storage with the specified name
        rl.question('Enter claim name : ', (name) => {
            var claims = store.get(storageLocation)
            for (var i = 0; i < claims.length; i++) {
                var contents = module.exports.getClaimContents(claims[i])
                if (name === contents.name) {
                    console.log(storageLocation + " removed with name '" + contents.name + "' and age '" + contents.age + "'")
                    claims.splice(i, 1)
                    store.set(storageLocation, claims)
                    return
                }
            }
            console.log("No Claim found under the name of " + name)
        });
    },
    attestClaim: function (rl, storageLocation, attesterDetails) { // attest the claim with selected attestor
        // setup attester
        var attesterMnemonic = null
        try {
            attesterMnemonic = attesterDetails.mnemonic
        } catch (e) {
            console.log("No Attester exists")
            return
        }
        rl.question('Enter claim name : ', (name) => {
            var claims = store.get(storageLocation)
            var data, index = null
            for (var i = 0; i < claims.length; i++) {
                var contents = module.exports.getClaimContents(claims[i])
                if (name === contents.name) {
                    data = claims[i]
                    index = i
                    break
                }
            }
            if(index === null){
                console.log("No Claim found under the name of " + name)
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
    },
    verifyClaim: function(rl, storageLocation, claimerDetails){ // send request for verification and give feedback on result
        // check claimer was found
        if (claimerDetails == null) {
            console.log("No such claimer exists")
            return
        }
        rl.question('Enter claim name : ', (name) => {
            var claims = store.get(storageLocation)
            var claim = null
            for (var i = 0; i < claims.length; i++) {
                var contents = module.exports.getClaimContents(claims[i])
                if (name === contents.name) {
                    claim = claims[i]
                    break
                }
            }
            if(claim === null){
                console.log("No Claim found under the name of " + name)
                return
            }
            const result = Verifier.sendForVerification(claim, nonce => module.exports.handleNonceSigning(claimerDetails.mnemonic, nonce))
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
    },
    handleNonceSigning: function(claimerMnemonic, nonce) { // sign the nonce with the seleted claimer

        const claimer = Kilt.Identity.buildFromMnemonic(claimerMnemonic)
        // sign the nonce as the claimer with your private identity
        const signedNonce = claimer.signStr(nonce)
    
        return signedNonce
    }
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
