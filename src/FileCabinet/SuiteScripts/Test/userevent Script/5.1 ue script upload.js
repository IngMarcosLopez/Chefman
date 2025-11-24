/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

//场景：通过ue脚本实现SO显示“创建工单”按钮，然后CS脚本点击按钮，在console工作台显示触发效果
//一、用户事件脚本编写
define([],

    () => {
        const beforeLoad = (scriptContext) => {
            const form = scriptContext.form;
            var entityId = scriptContext.newRecord.getValue({
                fieldId: 'entityid'
            });
            form.addButton({
                id: 'custpage_created_wo',      //id需要custpage_开头
                label: '创建工单',
                functionName: `CustomButtonFunction("${entityId}","${scriptContext.type}")`
            })
            //form.clientScriptFieldId = xxx    //要在此表单中使用的客户端脚本文件的内部文件ID,考虑不同环境的ID值不同，一般不建议使用
            //form.clientScriptModulePath,要在此表单中使用的客户端脚本文件的相对路径,帮助中搜索form.clientScriptMoudlePath了解使用方法
            form.clientScriptModulePath = 'SuiteScripts/Test/userevent Script/5.2 cs script upload.js'  //module写错单词，自责下
        }

        return { beforeLoad }

    });
