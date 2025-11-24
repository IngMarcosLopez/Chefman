
define(["./constant"], (constantObj) => {
    return {
        pageInit: (context) => {
            const config = constantObj.SESSION_SUITELET_CONFIG;
            return config;
        },
        mask:{
            createLoadMask:()=>{
                return "createLoadMask";
            }
        }
    }
})