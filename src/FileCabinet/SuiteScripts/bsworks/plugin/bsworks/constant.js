
define([], () => {
    return {
        SESSION_SUITELET_CONFIG: "bsworks_suitelet_form_config",
        client: {
            LAODING_MASK_ID: "custom_mask",
            LOADING_MESSAGE_ID: "bsworks_loading_message",
            LOADING_MASK_IMG_URL: "https://7336086-sb1.app.netsuite.com/core/media/media.nl?id=19959&c=7336086_SB1&h=_ugln9_2g7QWoBtinG0wXTQ3Z9Am0lxAEj4HLW1Tf_ntUzOl"
        },
        suitelet: {
            SUBLIST_ID: "custpage_subitem_list",
            SUBLIST_TYPE: {
                LIST: "LIST",
                INLINEEDITOR: "INLINEEDITOR",
            },
            SUBLIST_CHECKBOX: "sublist_checkbox",
            SUBLIST_LINE_NUM: "sublist_line_num",
            FILTER_BUTTON_CONFIG: [
                { id: "custpage_button_search", label: "查&nbsp;&nbsp;询", primary: true, style: null },
                { id: "custpage_button_reset", label: "重&nbsp;&nbsp;置", primary: false, style: null },
                { id: "custpage_button_exportexcel", label: "&nbsp;&nbsp;导出EXCEL&nbsp;&nbsp;", primary: false, style: null }
            ]
        },
        //runtime accountId
        ac: ['1346c1adb8c85962dd0c9cbdb6aadba0', 'e0968ebe717427bb5feb52a22335c11e']
    }
})