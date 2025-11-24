/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message'],

    function (message) {
        function pageInit(scriptContext) {
            //Do Nothing
            //为使用客户端脚本，需要声明一个入口点
        }
        function customButtonFunction(entityId,type) {
            //log
            console.log("工单创建 Function 触发");

            //创建自定义message使用message模块
            const customMessage = message.create({      //帮助中搜索message.create模块
                title: 'Message',
                //`string text ${expression} string text`,
                //学习参照：搜索(Template Literals)或https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Template_literals
                message:`work order triggered: ${entityId} and ${type}`,
                type: message.Type.INFORMATION
            });
            //messge消息显示在左上角
            customMessage.show();
        }

        return {
            pageInit: pageInit,
            customButtonFunction: customButtonFunction
        };
    });
