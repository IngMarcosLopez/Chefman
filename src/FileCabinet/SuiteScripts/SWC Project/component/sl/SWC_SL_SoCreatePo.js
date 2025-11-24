/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', "N/url", 'N/https', 'N/format','N/email', 'N/runtime','N/search','N/currency'],

    (record,url,https,format,email,runtime,search,currency) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        var resultArr = [];
        var poUrlArr = [];
        const onRequest = (scriptContext) => {
            var scriptObj = runtime.getCurrentScript();
            log.audit({title: "usageStart", details: scriptObj.getRemainingUsage()});
            var request = scriptContext.request;
            var response = scriptContext.response;
            var dataJson = request.parameters.dataJson;
            var page = request.parameters.page;
            var pageSize = request.parameters.pageSize;

            log.audit("dataJson",typeof  dataJson)

            dataJson = ((typeof dataJson == "string") ? JSON.parse(dataJson) : dataJson);
            log.audit("dataJson",typeof  dataJson)
            log.audit("dataJson",dataJson)
            var subsidiaryFormMap = {
                "3":"115",//Al Cabinet Inc  AIC Purchase Order
                "2":"116",//Al Kitchen Inc	AIK Purchase Order
                "7":"117",//CB Kitchen and Bath	CB Purchase Order
                "4":"100",//Elevation Craft Inc	IPC Purchase Order
                "5":"100",//Impress Cabinetry Inc	IPC Purchase Order
                "6":"118"//KDK Kitchen and Bath	KDK Purchase Order
            }
            var resultArr = []; // 生成成功的po id提醒
            var soLineIdQtyJson = {}; // 回写so行数量
            var start = pageSize * (page - 1);
            var end = Math.min((pageSize * page - 1),dataJson["sublistArr"].length);


            for(var i = start; i <= end; i++) {
                var polineArr = dataJson["sublistArr"][i];

                var poRec = record.create({type:"purchaseorder",isDynamic:true});
                poRec.setValue({fieldId:"customform",value:subsidiaryFormMap[dataJson["subsidiary"]]}); // form 表单
                poRec.setValue({fieldId:"entity",value:polineArr[0]["vendor"]}); // 供应商
                poRec.setValue({fieldId:"subsidiary",value:dataJson["subsidiary"]}); // subsidiary
                poRec.setValue({fieldId:"custbody_swc_so_num",value:dataJson["soId"]}); // Sales Order#
                poRec.setValue({fieldId:"custbody_swc_so_id",value:dataJson["soId"]}); // so ID
                poRec.setValue({fieldId:"location",value:dataJson["location"]}); // 地点
                poRec.setValue({fieldId:"currency",value:dataJson["currency"]}); // 货币

                for(var k = 0; k < polineArr.length; k++) {
                    poRec.selectNewLine({sublistId:"item"});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"item",value:polineArr[k]["itemId"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:polineArr[k]["entryQty"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_origin_qty",value:polineArr[k]["entryQty"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"units",value:polineArr[k]["unitid"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"rate",value:polineArr[k]["untaxrate"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_original_price",value:polineArr[k]["untaxrate"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_so_lineid",value:polineArr[k]["soLineId"]});
                    poRec.setCurrentSublistValue({sublistId:"item",fieldId:"description",value:polineArr[k]["description"]});
                    poRec.commitLine({sublistId:"item"});

                    // so 行ID 回写数量
                    soLineIdQtyJson[polineArr[k]["soLineId"]] = polineArr[k]["entryQty"];
                }
                var poId = poRec.save({enableSourcing:true});
                if(poId) {
                    poUrlArr.push(url.resolveRecord({recordType:"purchaseorder",recordId:poId,isEditMode:false}));
                    resultArr.push("The purchase order was created successfully!,Purchase order ID：:"+poId);
                }
            }

            // // 回写本次solineid创建po的数量
            // var soRec = record.load({type:"salesorder",id:dataJson["soId"],isDynamic:true});
            // var count = soRec.getLineCount({sublistId:'item'});
            // for(var i = 0; i < count; i++) {
            //     soRec.selectLine({sublistId:"item",line:i});
            //     var soLineId = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"line"});
            //     if(soLineIdQtyJson.hasOwnProperty(soLineId)) {
            //         var poQty = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity"}) || 0;
            //         var newQty = Number(soLineIdQtyJson[soLineId]) - Number(poQty);
            //         soRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",value:newQty < 0 ? 0 : newQty});
            //         soRec.commitLine({sublistId:'item'});
            //     }
            // }
            // soRec.save({enableSourcing:true,ignoreMandatoryFields:true});


            var res = {
                "resultArr":resultArr,
                "soLineIdQtyJson":soLineIdQtyJson,
                "poUrlArr":poUrlArr,
                "soId":dataJson["soId"]
            }
            //如果这个数组里有值, 说明创建po成功了
            if(resultArr.length>0) {
                response.write(JSON.stringify(res));
            }
            log.audit({title: "usageEnd", details: scriptObj.getRemainingUsage()});
        }

        /**
         * 获取分页数据
         * @param saveSearch 保存检索
         * @param suboption 参数
         * @param flag true为订单sublist
         * @return 数据结果数组
         */
        function tenSearchResults(saveSearch,pageSize,pageNum) {
            var start = pageSize * (pageNum - 1);
            var end = pageSize * pageNum - 1;
            var tenSaveSearchResult = [];
            for (var i = start; i <= Math.min(saveSearch.length-1 , end); i++ ) {
                tenSaveSearchResult.push(saveSearch[i]);
            }
            return tenSaveSearchResult;
        }



        return {onRequest}

    });
