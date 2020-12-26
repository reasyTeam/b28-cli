(function (window, $) {
    // true
    /*    CONFIG_NEW_NETCTRL        */
    const tt = _('We are not \' the " same');
    /*    CONFIG_NEW_NETCTRL        */
    // false
    //  CONFIG_NET_WAN_STATIC 
    const tt = _('这条肯定不能被提取');
    /*CONFIG_NET_WAN_STATIC*/
    // true
    /*  CONFIG_PPPoE_SERVER     */
    const tt = _('CONFGI Word');
    /*CONFIG_PPPoE_SERVER*/
    /*CONFIG_WAN_LAN_COUNT_FROM_ZERO */
    const tt = _('CONFIG is Diff, so it can be selected.');
    /*    CONFIG_WAN_LAN_COUNT_FROM_ZERO1         */
    /*      CONFIG_WAN_LAN_COUNT_FROM_ZERO      */
    const tt = _('single Config has no use');
    /** HHHH */
    /*
    var s = _("注释内容不进行提取");
    let k = _('不要提取我哦，小哥哥');
    */
    const tt = _('I don’t know how (\') to (") translate.');
    const tt = _('change line and tabs');
    function initTable(data) {
        var tableData = filterData($('#logType').val());
        formTable = $('#sysLog').TablePage({
            data: tableData,
            sortFields: [
                'sysLogTime',
                'ID'
            ],
            sortOpt: {
                sysLogTime: 2,
                ID: 2
            },
            // 按时间降序排列
            columns: [
                {
                    field: 'sysLogTime',
                    title: _('time group:'),
                    width: 170
                },
                {
                    field: 'sysLogType',
                    title: _('type:'),
                    width: 140,
                    format: function (data) {
                        switch (data) {
                        case 1:
                            return _('system log');
                        case 2:
                            return _('攻击日志');
                        case 3:
                            return _('error log');
                        }
                    }
                },
                {
                    field: 'sysLogMsg',
                    title: _('日志内容')
                }
            ]
        });
    }

    help = {
        wirelessaccess: {
        head: {
            title: _("MAC Filters"),
            content: _("\nNote: \n1. A max. of 64 rules is allowed for each SSID, and 100 rules for each frequency band. \n2. The MAC filter rule will be invalidated if the SSID it mapped to has been changed. You are required to manually choose an enabled wireless network to apply the MAC filter rule.")
        },
        body: [{
            title: _("MAC Address Filter1"),
            content: {
                [_("MAC Address Filter2")]: _("- Disable: All wireless clients can connect to the corresponding WiFi network of this router. \n- Only Allow: Only wireless clients with the specified MAC addresses can access the corresponding WiFi network of this device. \n- Only Forbid: Only wireless clients with the specified MAC addresses cannot access the corresponding WiFi networks of this device.")
            }
        },
        {
            title: _("MAC Filters List"),
            content: {
                // key 值没翻译 但是没有提取
                [_("MAC Filters List3")]: _('这是有双引号 " 有翻译的哦'),
                // 中间有双空格 有翻译 
                [_("MAC Address")]: _("Select a mode that address your application scenario \n- Coverage-oriented This mode applies to scenarios that the network environment is complex, users are scattered, and the interference is weak. \n- Capacity-oriented This mode applies to scenarios that the area is open and crowded with users and the interference is strong. \n- Default  This option is a balance between Coverage-oriented and Capacity-oriented."),
                [_("Effective Network")]: _("\n前有换行，会被认为没有翻译"),
                [_("Status")]: _("最后有多余的空格，会被认为没有翻译 ")
            }
        }]
        }
    }
}(window, $));