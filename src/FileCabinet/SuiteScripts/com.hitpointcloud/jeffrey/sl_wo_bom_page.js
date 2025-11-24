/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * Author       Jeffrey
 * Date         2023/5/12
 * Task         加工领料
 */
define(['N/error', 'N/record', 'N/search', 'N/task', 'N/ui/serverWidget', 'N/url','N/redirect','N/runtime','N/file','N/render','N/encode','N/config','N/format','./utils_func.js'],
    /**
 * @param{error} error
 * @param{record} record
 * @param{search} search
 * @param{task} task
 * @param{serverWidget} serverWidget
 * @param{url} url
 */
    (error, record, search, task, serverWidget, url,redirect,runtime,file,render,encode,config,format,func) => {

        //查询条件
        const searchFields = [
            {id:"custpage_body_wo_num",type:"multiselect",label:"工单号",container:"selectgroup",source:"workorder"},
            {id:"custpage_body_wo_status",type:"select",label:"工单状态",container:"selectgroup"},
            {id:"custpage_body_location",type:"select",label:"仓库",container:"selectgroup",source:"location"},
            {id:"custpage_body_location_type",type:"select",label:"仓库类型",container:"selectgroup",source:"customlist_hc_location_type"},
            {id:"custpage_body_wo_num_text",type:"textarea",label:"工单号text",container:"selectgroup",displayType:"hidden"},
            {id:"custpage_body_location_text",type:"text",label:"仓库text",container:"selectgroup",displayType:"hidden"},

        ];

        //分组
        const fieldGroup = [
            {id:'selectgroup',label:'筛选'},
            {id:'resultgroup',label:'查询结果'},
        ];

        //明细
        const rsFields = [
            {id:"custpage_line_select",type:"checkbox",label:"勾选"},
            {id:"custpage_line_item",type:"text",label:"货品编码"},
            {id:"custpage_line_item_name",type:"text",label:"货品名称"},
            {id:"custpage_line_manufacture",type:"text",label:"规格型号"},
            {id:"custpage_line_need_qty",type:'text',label:'需求数量'},
            {id:"custpage_line_handon_qty",type:"text",label:"现有库存"},
            {id:"custpage_line_wait_qty",type:"text",label:"待调发数量"},
            {id:"custpage_line_real_qty",type:"text",label:"实际调发数量"},
            {id:"custpage_line_itemid",type:"text",label:"货品编码id"},
        ];

        function viewPage(request, response) {
            let param = request.parameters;
            let form = createBodyField(param)
            setRsList(form,param)
            response.writePage({pageObject:form});
        }


        function  createBodyField(param) {
            let form = serverWidget.createForm({title: "加工领料单"});
            form.clientScriptModulePath = "./cs_wo_bom_page.js";
            form.addSubmitButton({label:"打印"})
            form.addButton({
                id: "search",
                label: "搜索",
                functionName: "searchData"
            });
            fieldGroup.forEach(function (value) {
                form.addFieldGroup(value)
            });
            searchFields.forEach(value=>{
                let searchfield = form.addField(value);
                if(value.id == 'custpage_body_wo_status'){
                    searchfield.addSelectOption({
                        value: '',
                        text: ''
                    })
                    searchfield.addSelectOption({
                        value: "WorkOrd:A",
                        text: "已计划"
                    })
                    searchfield.addSelectOption({
                        value: "WorkOrd:B",
                        text: "已发布"
                    })
                    searchfield.addSelectOption({
                        value: "WorkOrd:D",
                        text: "进行中"
                    })
                    searchfield.addSelectOption({
                        value: "WorkOrd:G",
                        text: "已构建"
                    })
                }
                if(value.id == 'custpage_body_wo_num' || value.id == 'custpage_body_location' || value.id == 'custpage_body_location_type'){
                    searchfield.isMandatory = true
                }
                if(value.displayType){
                    searchfield.updateDisplayType({displayType:value.displayType})
                }

                if(param[value.id]){
                    if(value.id == 'custpage_body_wo_num'){
                        searchfield.defaultValue = param[value.id].split(",")
                    }else {
                        searchfield.defaultValue = param[value.id]
                    }
                }
            })
            return form
        }


        function getInventory(itemArr,location) {
            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid","anyof",itemArr],
                        "AND",
                        ["inventorylocation","anyof",location]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "locationquantityonhand",
                            label: "地点现有"
                        })
                    ]
            });
            let searchData = func.getAllSearchData(itemSearchObj);
            let inventoryJson = {}
            if(searchData && searchData.length > 0){
                searchData.forEach(value => {
                    let itemId = value.id
                    let qty = Number(value.getValue({
                        name: "locationquantityonhand",
                        label: "地点现有"
                    }) || 0)
                    inventoryJson[itemId] = qty
                })
            }
            return inventoryJson;
        }

        function getWOInfo(param) {
            let searchLoad = search.load("customsearch_wo_bom_requisition")
            let filter = searchLoad.filterExpression;
            let searchInfo = [];
            let itemArr = [];
            if(param['custpage_body_wo_num']){
                filter.push('AND');
                filter.push(["internalid","anyof",param['custpage_body_wo_num'].split(",")])
                if(param['custpage_body_wo_status']){
                    filter.push('AND');
                    filter.push(["status","anyof",param['custpage_body_wo_status']])
                }
                if(param['custpage_body_location']){
                    filter.push('AND');
                    filter.push( ["location","anyof",param['custpage_body_location']])
                }
                if(param['custpage_body_location_type']){
                    filter.push('AND');
                    filter.push( ["location.custrecord_hc_location_type","anyof",param['custpage_body_location_type']] )
                }
                searchLoad.filterExpression = filter;
                log.debug("filter",filter)
                let searchData = func.getAllSearchData(searchLoad);
                log.debug("searchData",searchData)
                let column = searchLoad.columns;
                if(searchData && searchData.length > 0){
                    searchData.forEach((value)=>{
                        let rs = {}
                        column.forEach(e=>{
                            if(e.label == '货品编码'){
                                 rs[e.label] = value.getText(e)
                                 rs['货品编码id'] = value.getValue(e)
                            }else {
                                rs[e.label] = value.getValue(e)
                            }
                        })
                        searchInfo.push(rs)
                    })
                }

            }
            return searchInfo;
        }

        function setRsList(form,param) {
            let result_list = form.addSublist({id: "custpage_searchresults", type: 'list', label: '结果'});
            result_list.addMarkAllButtons()
            rsFields.forEach(function (value) {
                let result_field = result_list.addField(value);
                if(value.id == 'custpage_line_real_qty'){
                    result_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY})
                }
                if(value.id == 'custpage_line_itemid'){
                    result_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
                }
                if (value["displayType"] == 'hidden') {
                    result_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
                }
            });
            let searchInfo = getWOInfo(param)
            log.debug("searchInfo",searchInfo)
            if(searchInfo.length > 0){
                let mergeInfo = getmergeInfo(searchInfo,param['custpage_body_location'],param['custpage_body_location_type'])
                let index = 0 ;
                for(let key in mergeInfo){
                    rsFields.forEach(value => {
                        if(value.label == '现有库存' || value.label == '待调发数量'){
                            result_list.setSublistValue({id:value.id,line:index,value:mergeInfo[key][value.label]})
                        }
                        if(mergeInfo[key][value.label]){
                            result_list.setSublistValue({id:value.id,line:index,value:mergeInfo[key][value.label]})
                        }
                    })
                    index ++;
                }
            }

        }

        function getmergeInfo(searchInfo,location,location_type) {
            let mergeInfo = {};
            let itemArr = []
            searchInfo.forEach(value => {
                if(mergeInfo.hasOwnProperty(value['货品编码id'])){
                    mergeInfo[value['货品编码id']]['需求数量'] = func.accAdd( mergeInfo[value['货品编码id']]['需求数量'],value['需求数量'])
                }else {
                    itemArr.push(value['货品编码id'])
                    mergeInfo[value['货品编码id']] = {
                        '货品编码id':value['货品编码id'],
                        '货品编码':value['货品编码'],
                        '货品名称':value['货品名称'],
                        '规格型号':value['规格型号'],
                        '需求数量':value['需求数量'],
                    }
                }
            })
            log.debug("itemArr",itemArr)
            let inventoryJson = getInventory(itemArr,location)
            log.debug("inventoryJson",inventoryJson)
            log.debug("mergeInfo",mergeInfo)
            for(let key in mergeInfo){
                mergeInfo[key]['现有库存'] = inventoryJson[key]
                if(location_type == 1){
                    mergeInfo[key]['待调发数量'] = Math.ceil(func.accMinus( mergeInfo[key]['需求数量'],mergeInfo[key]['现有库存'])) < 0 ? 0 : Math.ceil(func.accMinus( mergeInfo[key]['需求数量'],mergeInfo[key]['现有库存']))
                }else {
                    mergeInfo[key]['待调发数量'] = 0
                }
            }
            log.debug("mergeInfo2",mergeInfo)
            return  mergeInfo

        }

        function submitPage(request, response) {
            try{
                let lineCount = request.getLineCount({group:"custpage_searchresults"});
                let param = request.parameters;
                let data = {
                    wo_num:param.custpage_body_wo_num_text,
                    location:param.custpage_body_location_text,
                    nowTime:func.timestampToTime(new Date()),
                }
                data.item = []
                for(let index = 0 ; index < lineCount;index ++){
                    let is_selected = request.getSublistValue({
                        group:"custpage_searchresults",
                        name:"custpage_line_select",
                        line:index
                    })
                    if(is_selected == true || is_selected == 'T'){
                        data.item.push({
                            itemCode:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_item", line:index}),
                            itemName:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_item_name", line:index}),
                            itemType:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_manufacture", line:index}),
                            needQty:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_need_qty", line:index}),
                            handQty:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_handon_qty", line:index}),
                            waitQty:request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_wait_qty", line:index}),
                            realQty:Number(request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_real_qty", line:index})||0) == 0 ? '' : request.getSublistValue({group:"custpage_searchresults", name:"custpage_line_real_qty", line:index})  ,
                        })
                    }
                }
                log.debug("data",data)
                let f_render = render.create();
                f_render.addCustomDataSource({
                    format: render.DataSource.JSON,
                    alias: "data",
                    data: JSON.stringify(data)
                });
                let fileObj = file.load({id:"SuiteScripts/com.hitpointcloud/jeffrey/sl_wo_bom_pdf.xml"});
                f_render.templateContent = fileObj.getContents();
                var pdf_file = f_render.renderAsPdf();
                log.debug("l")
                // var fstr = encode.convert({
                //     string: pdf_file,
                //     inputEncoding: encode.Encoding.UTF_8,
                //     outputEncoding: encode.Encoding.BASE_64
                // });
                // var pdff = file.create({
                //     name: '工单领料单.pdf',
                //     fileType: file.Type.PDF,
                //     contents: fstr
                // });
                response.writeFile({ file: pdf_file, isInline: true});
            }catch (e) {
                log.debug(e)
            }



        }





        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const {request, response, request: {method: method}, request: {parameters: params}} = scriptContext;
            switch (method) {
                case 'GET' :
                    viewPage(request, response);
                    break;
                case 'POST':
                    submitPage(request, response);
                    break;
                default:
                    break;
            }

        }

        return {onRequest}

    });
