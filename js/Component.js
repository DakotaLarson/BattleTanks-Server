module.exports = class Component{
    constructor(){
        this.children = [];
        this.state = {};
    }
    enable = () =>{};
    disable = () => {};
    attachChild = (component) => {
        if(this.children.indexOf(component) < 0){
            this.children.push(component);
            component.enable();
        }
    };

    detachChild = (component) => {
        let index = this.children.indexOf(component);
        let detachChildren = (component) => {
            let childCount = component.children.length;
            for(let i = 0; i < childCount; i ++){
                let child = component.children[i];
                child.disable();
                detachChildren(child);
            }
            component.children.splice(0, childCount);
        };

        if(index > -1){
            this.children.splice(index, 1);
            component.disable();
            detachChildren(component);
        }

    };
};
