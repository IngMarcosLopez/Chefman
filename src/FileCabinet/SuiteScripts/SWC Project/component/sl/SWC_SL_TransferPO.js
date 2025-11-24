/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/record', 'N/search', 'N/format','N/ui/serverWidget','N/url','N/query'],
/**
 * @param {runtime} runtime
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(runtime, record, search, format,serverWidget,url,query) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        // 查询条件
        var soId = context.request.parameters.recid || '';       // 销售订单ID
        var subsidiary = context.request.parameters.subsidiary || '';       // 销售订单ID

        var option = {
            'request' : context.request,
            'resonpse' : context.response,
            'soId' : soId,
            'subsidiary' : subsidiary,
        }

        // 查询方法
        queryFunc(option);

        // 创建form
        createForm(option);
        // 给body字段赋值
        setFieldValue(option);
        // 创建子列表
        createSublist(option);
        // 给子列表赋值
        setSublistValue(option);

        context.response.writePage({pageObject : option.form});
    }

    /**
     * 创建form
     * @param option
     */
    function createForm(option) {
        var form = serverWidget.createForm({title: 'Transform Purchase Order'});
        form.clientScriptModulePath = '../cs/SWC_CS_TransferPO';

        form.addButton({id:'custpage_submitbtn', label:'Submit', functionName:'submitFunc'});
        var vendorField = form.addField({id:'custpage_vendor',label:'Vendor',type:serverWidget.FieldType.SELECT});
        var soTranIdField = form.addField({id:'custpage_salesorder',label:'Sales Order#',type:'TEXT'});
        soTranIdField.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED})
        var subsidiaryField = form.addField({id:'custpage_subsidiary',label:'Subsidiary',type:serverWidget.FieldType.SELECT,source:"subsidiary"});
        subsidiaryField.updateBreakType({breakType:serverWidget.FieldBreakType.STARTCOL})
        subsidiaryField.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED})
        var currencyField = form.addField({id:'custpage_currency',label:'Currency',type:serverWidget.FieldType.SELECT,source:"currency"});
        currencyField.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED})
        var itemVendorPriceField = form.addField({id:'custpage_itemvendorprice',label:'Item vendor price json',type:serverWidget.FieldType.LONGTEXT});
        itemVendorPriceField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var soidField = form.addField({id:'custpage_soid',label:'soId',type:serverWidget.FieldType.TEXT});
        soidField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var locaitonField = form.addField({id:'custpage_location',label:'locationid',type:serverWidget.FieldType.TEXT});
        locaitonField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})

        //屏幕遮罩
        var hidden_field = form.addField({ id:'hidden_info',type:serverWidget.FieldType.INLINEHTML,label:'屏幕遮罩'});
        hidden_field.defaultValue = '<div id="timeoutblocker" style="position: fixed; z-index: 10000; top: 0px; left: 0px; height: 100%; width: 100%; margin: 5px 0px; background-color: rgb(155, 155, 155); opacity: 0.6;"><span style="width:100%;height:100%;line-height:700px;text-align:center;display:block;font-weight: bold; color: red">Loading ... </span></div>';
        option.form = form;

        vendorField.addSelectOption({value: "", text: ""});
        for(var i = 0; i < option.vendorJsonArr.length; i++) {
            vendorField.addSelectOption({
                value: option.vendorJsonArr[i]['value'],
                text: option.vendorJsonArr[i]['text']
            });
        }
    }

    /**
     * body字段设置值
     * @param option
     */
    function setFieldValue(option) {
        option.form.updateDefaultValues({
            'custpage_vendor':"",
            'custpage_salesorder':option.tranId,
            'custpage_subsidiary':option.subsidiary,
            'custpage_currency':option.currency,
            'custpage_soid':option.soId,
            'custpage_location':option.location,
            'custpage_itemvendorprice':JSON.stringify(option.selectedVendorJson)
        });
    }

    /**
     * 创建子列表
     * @param option
     */
    function createSublist(option) {
        var sublist = option.form.addSublist({id: 'custpage_sublist', type: serverWidget.SublistType.LIST, label: 'List'});
        sublist.addMarkAllButtons();

        sublist.addField({id:'custpage_ck',label:'Options',type:serverWidget.FieldType.CHECKBOX});
        var vendorSubField = sublist.addField({id:'custpage_vendor_sub',label:'Vendor',type:serverWidget.FieldType.SELECT});
        vendorSubField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var itemidFiled = sublist.addField({id:'custpage_itemid',label:'Itemid',type:serverWidget.FieldType.TEXT});
        itemidFiled.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var itemField = sublist.addField({id:'custpage_item',label:'Item',type:serverWidget.FieldType.TEXT});
        itemField.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED})
        var lineidField = sublist.addField({id:'custpage_lineid',label:'Line ID',type:serverWidget.FieldType.TEXT});
        lineidField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var quantity = sublist.addField({id:'custpage_quantity',label:'Quantity',type:serverWidget.FieldType.FLOAT});
        var entryQtyField = sublist.addField({id:'custpage_entryquantity',label:'Enrty Quantity',type:serverWidget.FieldType.FLOAT});
        entryQtyField.updateDisplayType({displayType:serverWidget.FieldDisplayType.ENTRY})
        var unitField = sublist.addField({id:'custpage_unit',label:'Units',type:serverWidget.FieldType.TEXT});
        unitField.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED})
        var unitidField = sublist.addField({id:'custpage_unitid',label:'Units',type:serverWidget.FieldType.TEXT});
        unitidField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var descriptionField = sublist.addField({id:'custpage_description',label:'Description',type:serverWidget.FieldType.TEXT});
        // descriptionField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var purchasecostField = sublist.addField({id:'custpage_purchasecost',label:'Purchase cost',type:serverWidget.FieldType.TEXT});
        purchasecostField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN})
        var untaxRateField = sublist.addField({id:'custbody_untaxrate',label:'Purchase price no tax',type:serverWidget.FieldType.CURRENCY});
        untaxRateField.updateDisplayType({displayType:serverWidget.FieldDisplayType.ENTRY})
        untaxRateField.isMandatory = true;

        vendorSubField.addSelectOption({value: "", text: ""});
        for(var i = 0; i < option.vendorJsonArr.length; i++) {
            vendorSubField.addSelectOption({
                value: option.vendorJsonArr[i]['value'],
                text: option.vendorJsonArr[i]['text']
            });
        }

        option.sublist = sublist;
    }

    /**
     * 子列表赋值
     * @param option
     */
    function setSublistValue(option) {
        for(var i = 0; i < option.sublistArr.length; i++) {
            if(option.sublistArr[i]['itemId']) option.sublist.setSublistValue({id:'custpage_itemid',line:i,value:option.sublistArr[i]['itemId']});
            if(option.sublistArr[i]['itemTxt']) option.sublist.setSublistValue({id:'custpage_item',line:i,value:option.sublistArr[i]['itemTxt']});
            if(option.sublistArr[i]['lineId']) option.sublist.setSublistValue({id:'custpage_lineid',line:i,value:option.sublistArr[i]['lineId']});
            if(option.sublistArr[i]['description']) option.sublist.setSublistValue({id:'custpage_description',line:i,value:option.sublistArr[i]['description']});
            if(option.sublistArr[i]['itemCost']) option.sublist.setSublistValue({id:'custpage_purchasecost',line:i,value:Number(option.sublistArr[i]['itemCost']).toString()});
            if(option.sublistArr[i]['quantity']) option.sublist.setSublistValue({id:'custpage_quantity',line:i,value:option.sublistArr[i]['quantity']});
            if(option.sublistArr[i]['quantity']) option.sublist.setSublistValue({id:'custpage_entryquantity',line:i,value:option.sublistArr[i]['quantity']});
            if(option.sublistArr[i]['unit']) option.sublist.setSublistValue({id:'custpage_unit',line:i,value:option.sublistArr[i]['unit']});
            if(option.sublistArr[i]['unitid']) option.sublist.setSublistValue({id:'custpage_unitid',line:i,value:option.sublistArr[i]['unitid']});
        }
    }

    /**
     * 查询功能
     * @param option
     */
    function queryFunc(option) {
        if(option.soId) {
            // 根据销售订单ID 查询销售订单未发货数量
            getSoUnshippedJson(option);
            // 获取登录人的子公司相同的供应商
            getvendorSelectJson(option);

        }
    }

    /**
     * 获取登录人的子公司相同的供应商
     * @param option
     */
    function getvendorSelectJson(option) {
        option.vendorJsonArr = [];
        var vendorSearchObj = search.create({
            type: "vendorsubsidiaryrelationship",
            filters: [["subsidiary","anyof",option.subsidiary],
                "AND",
                ["vendor.category","noneof","3"]],//Vendor : Category  not Tax agency
            columns:
                [
                    search.createColumn({name: "entity", label: "Vendor"}),
                    search.createColumn({name: "entityid", join: "vendor", label: "ID"}),
                    search.createColumn({name: "altname", join: "vendor", label: "Name"})
                ]
        });
        var res = getAllResultsOfSearch(vendorSearchObj);
        for(var i = 0; i < res.length; i++) {
            var name = res[i].getValue({name: "altname", join: "vendor"});
            var internalid = res[i].getValue({name: "entity"});
            var entityid = res[i].getValue({name: "entityid", join: "vendor"});
            option.vendorJsonArr.push({
                "value":internalid,
                "text":entityid+" "+name
            })
        }
    }

    /**
     * 查询销售未发货数量
     * @param option
     */
    function getSoUnshippedJson(option) {
        option.tranId = "";
        option.currency = "";
        option.customer = "";
        option.selectedVendorJson = {}; // 每一行货品可选择的供应商及其单价
        option.sublistArr = [];
        option.itemIdArr = [];
        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
                [
                    ["internalid","anyof",option.soId],
                    "AND",
                    ["mainline","is","F"],
                    "AND",
                    ["formulanumeric: case when {custcol_swc_poquantity} = ABS({quantity}) then 0 else 1 end","equalto","1"],
                    "AND",
                    ["taxline","is","F"],
                    "AND",
                    ["itemtype","isnot","Group"],
                    "AND",
                    ["itemtype","isnot","EndGroup"],
                    "AND",
                    ["item.type","anyof","InvtPart"]
                ],
            columns:
                [
                    search.createColumn({name: "entity", label: "Name"}),
                    search.createColumn({name: "tranid", label: "Document Number"}),
                    search.createColumn({name: "location", label: "Location"}),
                    search.createColumn({name: "statusref", label: "Status"}),
                    search.createColumn({name: "subsidiary", label: "Subsidiary"}),
                    search.createColumn({name: "currency", label: "Currency"}),
                    search.createColumn({name: "item", label: "Item"}),
                    search.createColumn({name: "quantity", label: "Quantity"}),
                    search.createColumn({name: "custcol_swc_poquantity", label: "custcol_swc_poquantity"}),
                    search.createColumn({name: "unit", label: "Units"}),
                    search.createColumn({name: "memo", label: "Description"}),
                    search.createColumn({name: "unitid", label: "Unit Id"}),
                    search.createColumn({name: "cost", join: "item", label: "Purchase Price"}),
                    search.createColumn({name: "line", label: "Line ID"}),
                ]
        });
        var res = getAllResultsOfSearch(transactionSearchObj);
        for(var i = 0; i < res.length; i++) {
            option.tranId = res[i].getValue({name: "tranid"});
            option.subsidiary = res[i].getValue({name: "subsidiary"});
            option.currency = res[i].getValue({name: "currency"});
            option.customer = res[i].getValue({name: "entity"});
            option.location = res[i].getValue({name: "location"});

            var customer = res[i].getValue({name: "entity"});
            var documentNo = res[i].getValue({name: "tranid"});
            var subsidiaryTxt = res[i].getText({name: "subsidiary"});
            var subsidiaryId = res[i].getValue({name: "subsidiary"});
            var currency = res[i].getValue({name: "currency"});
            var itemId = res[i].getValue({name: "item"});
            var itemTxt = res[i].getText({name: "item"});
            var quantity = Math.abs(res[i].getValue({name: "quantity"}));
            var poquantity = res[i].getValue({name: "custcol_swc_poquantity"});
            var unit = res[i].getValue({name: "unit"});
            var unitid = res[i].getValue({name: "unitid"});
            var itemCost = res[i].getValue({name: "cost", join: "item"}) || 0;
            var lineId = res[i].getValue({name: "line"});
            var description = res[i].getValue({name: "memo"});


            if(option.itemIdArr.indexOf(itemId) < 0) {
                option.itemIdArr.push(itemId);
            }

            option.sublistArr.push({
                "customer" : customer,
                "documentNo" : documentNo,
                "subsidiaryTxt" : subsidiaryTxt,
                "subsidiaryId" : subsidiaryId,
                "currency" : currency,
                "itemId" : itemId,
                "itemTxt" : itemTxt,
                "quantity" : Number(Number(quantity) - Number(poquantity)).toString(),
                "unit" : unit,
                "unitid" : unitid,
                "itemCost" : itemCost,
                "description" : description,
                "lineId" : lineId
            });
        }

        if(option.itemIdArr.length) {
            // var itemSearchObj = search.create({
            //     type: "item",
            //     filters: [["internalid","anyof",option.itemIdArr]],
            //     columns:
            //         [
            //             search.createColumn({name: "internalid", label: "internal id"}),
            //             search.createColumn({name: "vendorcost", label: "Vendor Price"}),
            //             search.createColumn({name: "othervendor", label: "Vendor"}),
            //             search.createColumn({name: "subsidiary", join: "vendor", label: "Primary Subsidiary"})
            //         ]
            // });
            var sql = `select subsidiary,item,vendor,vendorcost from itemvendor where item in (${option.itemIdArr})`
            var res = query.runSuiteQL({query:sql}).asMappedResults();
            // var res = getAllResultsOfSearch(itemSearchObj);
            for(var i = 0; i < res.length; i++) {
                var itemId = res[i].item;
                var vendorcost = res[i].vendorcost;
                var othervendor = res[i].vendor;
                var subsidiary = res[i].subsidiary;
                // var itemId = res[i].getValue({name:"internalid"});
                // var vendorcost = res[i].getValue({name:"vendorcost"});
                // var othervendor = res[i].getValue({name:"othervendor"});
                // var subsidiary = res[i].getValue({name: "subsidiary", join: "vendor"});

                if(othervendor) {
                    option.selectedVendorJson[itemId] = option.selectedVendorJson[itemId] || {};
                    option.selectedVendorJson[itemId][othervendor+"_"+subsidiary] = vendorcost;
                }

            }
        }
    }


    /**
     * 获取所有保存检索结果
     * @param saveSearch 保存检索
     * @return 数据结果数组
     */
    function getAllResultsOfSearch(saveSearch) {
        var resultset = saveSearch.run();
        var start = 0;
        var step = 1000;
        var resultArr = [];
        var results = resultset.getRange({
            start : start,
            end : Number(start) + Number(step)
        });
        while (results && results.length > 0) {
            resultArr = resultArr.concat(results);
            start = Number(start) + Number(step);
            results = resultset.getRange({
                start : start,
                end : Number(start) + Number(step)
            });
        }
        return resultArr;
    }



    return {
        onRequest: onRequest
    };

});
