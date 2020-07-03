const store = require('store')
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const commands = {
    list: null,
    Claimer: {
        create: null,
        remove: null
    },
    Attester: {
        create: null,
        remove: null
    },
    Claim: {
        create: null,
        remove: null
    }

}

rl.on('line', (input) => {
    rl.pause()
    try{
        commands[input]()
    }catch(e){
        console.log(e)
    }
});

rl.on('close', () => {
    console.log("Localy stored data:")
    console.log(store.get('save'))
})

