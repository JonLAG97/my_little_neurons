//Creature properties
let ms = 20;//timesteps duration
let x = 300//position
let y = 300
let vx = 0//velocity
let vy = 0
let mx = 0;//command
let my = 0;
let timestep = 0;
const radius = 15;
const ground = 600 - radius;
const wall = 600 - radius;

class connection{
    constructor(pre_neuron, post_neuron, W){
        this.pre_neuron = pre_neuron;
        this.post_neuron = post_neuron;
        this.W = W;

        this.last_eleg = 0;      
        this.elegibility = 0;//elegibility accumulation
        this.elegibility_t = 300;//duration of learning thrace
        
        post_neuron.inputs.push(this);//to access it during stdp
    }
}

class Neuron{
    constructor(type, id){
        this.type = type //0=normal,1=inhibitory,2=input,3=output
        this.id = id;

        this.V_th = 1;//threshold
        this.V = Math.random(); //init voltage
        this.V_reset = null;//reset potential
        this.refractory = [1,1,1,1];
        this.refractory = this.refractory[this.type];
        this.decay_m = 20; //membrane time constant
        this.decay_m = Math.exp(-1/this.decay_m);
        this.I = 0;
        this.a = 0; //adaptation
        
        this.firing = 0;
        this.decay_f = 5; //membrane time constant
        this.decay_f = Math.exp(-1/this.decay_m);

        this.pd = -0.0;//rate of potentiation or depression
        this.pd_t = 50;

        this.last_spike = -10;

        this.connections = [];
        this.inputs = [];

        this.moving_avg;
    }

    integrate(){
        if(this.last_spike<timestep-this.refractory){
            this.V += gaussian_noise(0.005);//a bit of noise
            this.V = this.V*this.decay_m + this.I;
        }
        this.I = 0;//reset input

        if(this.V>this.V_th){//above threshold after refractory
            this.spike=1;//z
            this.V-=this.V_th;//reset
        }else{this.spike=0;}
    }

    fire(force){
        if(this.spike || force){
            this.firing++;
            this.last_spike=timestep;
        }

        for(let i=0; i<this.connections.length; i++){
            const conn=this.connections[i];
            conn.post_neuron.I += this.firing*conn.W;//integrate spike
        }

        this.firing *= this.decay_f;
    }
}


class Brain{
    constructor(){
        this.target = 10;//hertz
        this.neurons = [];//all neurons        
        this.grid = [];
        this.input = []; this.output = [];

        let length=50;
        
        for (let i=0; i<40; i++) { this.input.push(new Neuron(2, i)); }
        for (let i=0; i<4; i++) { this.output.push(new Neuron(3, "o"+i)); }
        for (let i=0; i<length**2; i++) {
            this.grid.push(new Neuron(0, [i%length, Math.floor(i/length)]));
        }
        this.neurons = this.neurons.concat(this.input);
        this.neurons = this.neurons.concat(this.grid);
        this.neurons = this.neurons.concat(this.output);
        this.n = this.neurons.length;//neuron total
        
        //CONNECT
        for(let i=0; i<this.grid.length; i++){//inputs
            let mov_inputs = Math.floor(Math.random()*4);//select a group of neurons and multiply by size of group
            for(let j=mov_inputs; j<mov_inputs+1; j++){//movement inputs
                this.input[j].connections.push(new connection(
                    this.input[j], this.grid[i], 0.6,
                ));
            }
        }

        Math.sqrt(this.grid.length);//of the matrix side
        for(let i=0; i<this.grid.length; i++){//grid cell connections
            let pos1 = offset_center(this.grid[i], 2, length);//offset integrates movement
            //let pos1= this.grid[i].id;
            for(let j=0; j<this.grid.length; j++){
                let pos2 = this.grid[j].id;//target
                let distx = Math.abs(pos1[0]-pos2[0]);
                let disty = Math.abs(pos1[1]-pos2[1]);
                //calculate looped distance
                if(distx > Math.floor(length/2)){ distx = length - distx }                
                if(disty > Math.floor(length/2)){ disty = length - disty }
                let dist = Math.sqrt( distx**2 + disty**2 );
                if(dist<12){
                    this.grid[i].connections.push(new connection(
                        this.grid[i], this.grid[j], 4*center_surround(dist, 1, 12),
                    ));
                }
            }
        }
    }

    update(){
        for(let i=0; i<this.neurons.length; i++){
            this.neurons[i].integrate();
        }
        
        for(let i=0; i<this.neurons.length; i++){
            this.neurons[i].fire();
        }
    }

    set_input(){     
        let bias = 2;
        let scale = 0.40;
        let sd = 0.5;
        let magnitude = Math.sqrt( vy**2 + vx**2) + bias;
        let activation;
        
        if(activation!=bias){            
            activation = gaussian_density( Math.atan2(vx, (vy+bias)), 0, sd) * magnitude;//the further away from its prefered angle, the smaller the activation
            this.input[0].I = Math.log(activation) * scale;

            activation = gaussian_density( Math.atan2(vx, (-vy+bias)), 0, sd) * magnitude;
            this.input[1].I = Math.log(activation) * scale;

            activation = gaussian_density( Math.atan2(vy, (vx+bias)), 0, sd) * magnitude;
            this.input[2].I = Math.log(activation) * scale;
            
            activation = gaussian_density( Math.atan2(vy, (-vx+bias)), 0, sd) * magnitude;
            this.input[3].I = Math.log(activation) * scale;
        }else{
            this.input[0].I = Math.log(magnitude * gaussian_density(0, 0, sd)) * scale;
            this.input[1].I = Math.log(magnitude * gaussian_density(0, 0, sd)) * scale;
            this.input[2].I = Math.log(magnitude * gaussian_density(0, 0, sd)) * scale;
            this.input[3].I = Math.log(magnitude * gaussian_density(0, 0, sd)) * scale;
        }

        /*for(let i=5; i<10; i++){//random spike train
            if( Math.random() < this.target/1000 ){ this.input[i].fire(true); }
        }*/
    }

    get_output(){
        //      
    }

    get_firing(){
        let firing = [];
        for(let i=0; i<this.n; i++){
            if(this.neurons[i].last_spike >= timestep-2){//is neuron spiking?
                firing.push(true);
            }else{
                firing.push(false);
            }
        }
        
        return firing;
    }
}

//SIM LOOP
const brain = new Brain;
setInterval(() => {
    brain.set_input();
    brain.update();
    //user control
    if( mx!=0 || my!=0 ){
        vx+=0.03*mx;
        vy+=0.03*my;
    }else{
        //brain.get_output();
    }
    vx *= 0.999; //motion drag
    vy *= 0.999;
    x += vx/10;//final speed
    y += vy/10;

    //limits
    let bounce = -0.1; //lose speed on bounce
    if (x>wall){
        x=wall;
        vx *= bounce;
    }if (x<radius ){
        x=radius;
        vx *= bounce;
    }if (y>ground){
        y=ground;
        vy *= bounce;     
    }if (y<radius ){
        y=radius;
        vy *= bounce; 
    }
    timestep++;
}, ms);

self.onmessage = (event) => {
        let firing = brain.get_firing();
        ({ mx,my } = event.data);
        self.postMessage({ x,y,firing });//reply to message
};



//FUNCTIONS
function offset_center(neur, offset, length){
    let pos = neur.id;
    let input_dir = neur.inputs[0].pre_neuron.id;
    switch (input_dir) {
        case 0:
            pos[0] += offset;
            if(pos[0] >= length){//avoid overflow
                pos[0] -= length;
            }
            break;
        case 1:
            pos[0] -= offset;
            if(pos[0] < 0){
                pos[0] += length;
            }
            break;
        case 2:
            pos[1] += offset;
            if(pos[1] >= length){
                pos[1] -= length;
            }
            break;
        case 3:
            pos[1] -= offset;
            if(pos[1] < 0){
                pos[1] += length;
            }
            break;
    }
    return pos;
}

function center_surround(dist, e, periodicity){//e of 1 means 0 exitation
    let beta=3/periodicity**2;
    let alpha=beta*1.05;
    return e*Math.exp(-alpha*dist**2)-Math.exp(-beta*dist**2);
}



var spare_random=null;
function gaussian_noise(sd){
    if(spare_random==null){
        let u1 = Math.random();
        let u2 = Math.random();
        const partial= Math.sqrt(-2 * Math.log(u1));
        let z1 = partial * Math.cos(2 * Math.PI * u2);
        let z2 = partial * Math.sin(2 * Math.PI * u2);
        spare_random = z2;
        return z1*sd;
    }
    const z2 = spare_random;
    spare_random = null;
    return z2*sd;
}

function poisson_noise(mean){
    const val = Math.round( mean + Math.sqrt(mean)*gaussian_noise(1) );
    return Math.max(0, val);
}

function gaussian_density(x, μ, σ){//value, mean, amplitude
    return 1/( σ * Math.sqrt(2*Math.PI) ) * Math.exp(-0.5*( (x-μ)**2 / σ**2 ) );
}

function sigmoid(num){
    return 1/(1+Math.exp(-num));
}