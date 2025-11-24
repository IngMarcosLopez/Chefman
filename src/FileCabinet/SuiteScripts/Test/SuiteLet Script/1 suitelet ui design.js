/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
//Suitelet 是 SuiteScript API 的扩展，可让开发人员构建自定义 NetSuite 页面和后端逻辑，帮助中心搜索N/UI/ServerWidget。
//Suitelet 是服务器端脚本，以请求响应模式运行。它们通过GET/POST请求被系统生成的 URL 调用，表现结果为页面加载时为GET，页面提交时为POST。

define(['N/ui/serverWidget', 'N/search'],            //search用来子列表数据取值

    (serverWidget, search) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request == 传入的请求
         * @param {ServerResponse} scriptContext.response - Suitelet response == suitelet的响应
         * @since 2015.2
         */

        const onRequest = (scriptContext) => {
            //通过html语言，在页面显示hello world
            //搜索ServerResponse.write
            /*       var html = '<html><body><h1>hello,world<h1><boday><html>'
                     scriptContext.response.write(html);                         */

            //二、下面部分是真实的详细设计

            if (scriptContext.request.method == 'GET') {           //如果请求方法是GET，则执行下面的1~13条语句
                //1.创建一个表单，通过serverWidget.createForm方法
                var form = serverWidget.createForm({
                    title: '生产缺料分析'
                });

                //2.表单中添加字段组，通过Form.addFieldGroup方法
                var fieldGroup = form.addFieldGroup({
                    id: 'custpage_filter',
                    label: '筛选条件'
                });

                var fieldGroup = form.addFieldGroup({
                    id: 'custpage_parameter',
                    label: '确认参数'
                });

                //3.向表单添加字段，通过form.addField方法，字段类型选择通过serverWidget.FieldType查看适用类型
                var date = form.addField({
                    id: 'custpage_date', type: serverWidget.FieldType.DATE, label: '日期',
                    container: 'custpage_filter',       //字段组的ID，表示字段放在这个字段组中
                });
                var vendor = form.addField({
                    id: 'custpage_vendor', type: serverWidget.FieldType.SELECT, label: '供应商', source: 'vendor', container: 'custpage_filter'
                });

                //4.进行日期字段必填控制，通过field.isMandatory方法
                date.isMandatory = true;

                var subsidiary = form.addField({
                    id: 'custpage_subsidiary', type: serverWidget.FieldType.SELECT, label: '子公司', source: 'subsidiary', container: 'custpage_parameter'
                });

                //5.向表单增加按钮，通过form.addButton(普通)/Form.addSubmitButton(提交)/Form.addResetButton(重置)
                var check = form.addButton({
                    id: 'custpage_check', label: '查询'
                });
                form.addSubmitButton({
                    label: '提交'
                });
                form.addResetButton({
                    label: '重置'
                });

                //6.表单增加子列表，通过Form.addSublist、serverWidget.SublistType方法
                var sublist = form.addSublist({
                    id: 'custpage_wo_sublist',
                    type: serverWidget.SublistType.LIST,       //SublistType分为INLINEEDITOR/EDITOR/LIST/STATICLIST
                    label: '工单明细信息'
                });

                //7.子列表中增加标记全部按钮，通过Sublist.addMarkAllButtons方法
                sublist.addMarkAllButtons();
                //8.子列表添加刷新按钮，通过Sublist.addRefreshButton方法
                sublist.addRefreshButton();

                //9.子列表添加字段值，通过Sublist.addField方法
                sublist.addField({
                    id: 'custpage_line_select', type: serverWidget.FieldType.CHECKBOX, label: '选择'
                });
                sublist.addField({
                    id: 'custpage_line_date', type: serverWidget.FieldType.DATE, label: '日期'
                });
               var woNumber = sublist.addField({
                  id: 'custpage_wo_number', type: serverWidget.FieldType.TEXT, label: '工单号'
                });
             //子列表字段必填：
              woNumber.isMandatory = true;
              
                sublist.addField({
                    id: 'custpage_line_wo_item', type: serverWidget.FieldType.TEXT, label: '物料编号'
                });

              //测试字段
              var memo =  sublist.addField({
                    id: 'custpage_memo', type: serverWidget.FieldType.TEXT, label: '备注'
                });
              memo.isMandatory = true;
              
                //10.将search中的内容加载至子列表，通过N/search中的search.load方法
                var mySearch = search.load({
                    id: 'customsearch_wo_build_analytics'
                });

                //11.遍历搜索结果，将字段与Search关联，通过ResultSet.each方法
                var lineCounter = 0;
                mySearch.run().each(function (result) {
                    var woDate = result.getValue({
                        name: 'startdate'
                    });
                    var woNumber = result.getValue({           //如果获取文本值，则result.getValue改为result.getText
                        name: 'tranid'
                    });
                    var woItem = result.getText({
                        name: 'item'
                    });

                    //将search的值，写入子列表中，通过Sublist.setSublistValue方法
                    sublist.setSublistValue({
                        id: 'custpage_line_date',
                        //line : 0                        //search的line=0，表示第1行
                        line: lineCounter,               //本次通过申明行变量var，来进行多行数据的显示
                        value: woDate
                    });
                    sublist.setSublistValue({
                        id: 'custpage_wo_number',
                        line: lineCounter,               //search的line=0，表示第1行
                        value: woNumber
                    });
                    sublist.setSublistValue({
                        id: 'custpage_line_wo_item',
                        line: lineCounter,               //search的line=0，表示第1行
                        value: woItem
                    });
                    lineCounter++;                        //进行行数据+1的显示
                    return true;
                });

                //12.子列表添加行数，通过Sublist.lineCount方法
                var numLines = sublist.lineCount;

                //13.将表单生成界面，通过ServerResponse.writePage方法
                scriptContext.response.writePage({
                    pageObject: form
                });
            }
            else {
                //其他请求方法(DELETE/GET/HEAD/PUT/POST),通搜索https.Method
                log.debug('请求方法是', scriptContext.request.method);

                //14.将页面字段信息进行参数请求
                //(1)获取页面Body的供应商,通过serverrequest.parameters方法
                var uvendor = scriptContext.request.parameters.custpage_vendor;
                log.debug('供应商', uvendor)

                //(2)获取页面子列表的行数，通过ServerRequest.getLineCount方法
                var lineNumber = scriptContext.request.getLineCount({
                    group: 'custpage_wo_sublist'
                });
                //获取子列表的字段值（本次取物料编码）,通过ServerRequest.getSublistValue方法
                for (var i = 0; i < lineNumber; i++) {
                    scriptContext.request.getSublistValue({
                        group: 'custpage_wo_sublist',
                        name: 'custpage_line_wo_item',
                        //    line: '2'
                        line: i
                    });
                }
                log.debug('item', uitem);

                //15.suiteLet表单提交后显示的数据，通过ServerResponse.write方法
                scriptContext.response.write({
                    output: '<h1>生产缺料分析，提交后生成的数据</h1>'
                });
            }
        }

        return { onRequest }

    });
