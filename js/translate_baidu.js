console.info("start document")
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        // listen for messages sent from background.js
        if (request.message === 'url') {
            if(!request.cookie){
                //用户未登录
                show_sign_in()
            } else {
                add_user_setting()
                handle_query()
            }
            hide_ui_element()
        } else if(request.message=="login-complete"){
            //用户登录成功
            var dialog = document.querySelector('dialog');
            if(null!=dialog){
                dialog.close();
            }
        } else if(request.message=="query-info"){
            //popup window 获得查询信息
            console.info("query-info")
            var target = document.getElementById('zonedword-wrap');
            let stringify=null
            if($(target).is(':visible')){
                let select_item = get_select_item()
                stringify=JSON.stringify(select_item)
            } else {
                let query_item = get_query_item()
                stringify=JSON.stringify(query_item)
            }
            //返回page-info
            chrome.runtime.sendMessage({
                message: 'page-info',
                data:stringify
            });
        } else if("query-session-complete"==request.message){
            if(request.data){
                let session_array = $.parseJSON(request.data);
                let navigation=$(".mdl-navigation")
                session_array.forEach(element => {
                    if(element.used){
                        navigation.append(`<a class="mdl-navigation__link selected" id='${element.id}' href="javascript:;">${element.name}</a>`);
                    } else {
                        navigation.append(`<a class="mdl-navigation__link" id='${element.id}' href="javascript:;">${element.name}</a>`);
                    }       
                });
                $(".mdl-navigation__link").click((e)=> {
                    chrome.runtime.sendMessage({
                        message: 'set_study-session-file',
                        data:e.target.id
                    });
                })
            }
        } else if("session-list-selected"==request.message){
            session_list_selected(request.data)
        }  else if("user-query-complete"==request.message){
            chrome.runtime.sendMessage({
                message: 'get-word-tag',
                data:request.data
            });
        }  else if("word-tag-complete"==request.message){
            $.each($(".tag-item"),(index,ele)=>{ ele.remove() });
            let tag_items = $.parseJSON(request.data);
            init_word_tag(request.select_tag,tag_items)
        }
});


function hide_ui_element(){
    //隐藏界面无用元素
    $(".logo-image").hide()
    $(".download-guide").hide()
    $(".manual-trans-btn").hide()
    //下载
    $(".manual-trans-info").hide()
    //人工翻译
    $(".trans-machine").hide()
    //用户收藏
    $(".collection-btn .data-hover-tip").hide()
    //意见反馈
    $(".extra-wrap").hide()
    //分享
    $(".follow-btns").hide()
    $(".copyright").hide()
}


function init_word_tag(select_tag,tag_items){
    let option_menu=$(".option-menu")
    tag_items.forEach((tag_item)=>{
        if(select_tag==tag_item.tag){
            option_menu.append(`<div id="${tag_item.tag}" class="tag-item clicked" style="background-color: ${tag_item.color}"></div>`)
        } else {
            option_menu.append(`<div id="${tag_item.tag}" class="tag-item" style="background-color: ${tag_item.color}"></div>`)
        }
    })
    $(".option-menu .tag-item").mouseover((ev)=>{
        $(ev.target).addClass('selected');
   });
   $(".option-menu .tag-item").mouseout((ev)=>{
        $(ev.target).removeClass("selected");
   });
   $('.option-menu .tag-item').click((ev)=>{
       $(ev.target).parent().find('.tag-item').removeClass('clicked');
       $(ev.target).addClass('clicked');
       let word_item=null
       var target = document.getElementById('zonedword-wrap');
       if($(target).is(':visible')){
           let select_item = get_select_item()
           word_item=select_item.word
       } else {
           let query_item = get_query_item()
           word_item=query_item.word
       }
       if(null!=word_item){
           //提交数据
           chrome.runtime.sendMessage({
                message: 'set-word-tag',
                tag:ev.target.id,
                data:word_item
            });
       }
   });
}

function show_sign_in(){
    if(!$(".record-sign-in").length){
        $.get(chrome.extension.getURL('user_sign_in.html'), function(data) {
            $($.parseHTML(data)).appendTo('body');
            document.documentElement.classList.add('mdl-js');
            componentHandler.upgradeAllRegistered();
            show_sign_in_dialog()
        });
    } else {
        show_sign_in_dialog()
    }
    
}

function show_sign_in_dialog(){
    var dialog = document.querySelector('dialog');
    if (!dialog.showModal) {
        dialogPolyfill.registerDialog(dialog);
    }
    dialog.showModal();
    dialog.querySelector('.cancel-button').addEventListener('click', function() {
        dialog.close();
    });
    dialog.querySelector('.sign-in-button').addEventListener('click', function() {
        let username=$("#username").val();
        let password=$("#password").val();
        chrome.runtime.sendMessage({
            message: 'user-login',
            username: username,
            password: password,
        });
    });
}

function handle_query(){
    //隐藏二维码下载
    let result_container=$('#left-result-container')
    if($.trim(result_container.text())){
        //动态刷新的，会导致DOMSubtreeModified事件不生效
        setTimeout(() => {
            $(".trans-ad-app-wrap").hide()
            let query_item=get_query_item()
            chrome.runtime.sendMessage({
                message: 'user-query',
                data:JSON.stringify(query_item)
            });
        }, 300);
    } else {
        result_container.bind('DOMSubtreeModified', function(e) {
            $(this).unbind("DOMSubtreeModified")
            setTimeout(() => {
                $(".trans-ad-app-wrap").hide()
                let query_item=get_query_item() 
                chrome.runtime.sendMessage({
                    message: 'user-query',
                    data:JSON.stringify(query_item)
                });
            }, 300);
        });
    }
}
var observer=undefined
function add_user_setting(){
    if(!$("#user-setting-content").length){
        $.get(chrome.extension.getURL('user_setting.html'), function(data) {
            $("body").append($($.parseHTML(data)))
            $(".user-settting").hide()
            $(".more-action-button").click(()=>{
                console.info("click user-setting!")
                $(".user-settting").fadeIn("normal",()=>{
                    $(document).click(dismiss_user_setting)
                })
            })
            //设置己有ip
            chrome.storage.local.get("address", function(result) {
                let address="https://192.168.3.8:8080/"
                if(result.address){
                    address=result.address
                }
                $(".address-item").addClass("is-dirty")
                $("#host-address").val(address)
            });
            $(".apply-button").click(()=>{
                chrome.storage.local.set({address:$("#host-address").val()});
            });
            document.documentElement.classList.add('mdl-js');
            componentHandler.upgradeAllRegistered();
            //查询学习系列
            chrome.runtime.sendMessage({ message: 'query-session' });
        });
        //动态弹窗
        if(observer){
            observer.disconnect()
        }
        var target = document.getElementById('zonedword-wrap');
        observer = new MutationObserver(function(mutations) {
            if($(target).is(':visible')){
                let query_item=get_select_item()
                console.info(query_item.word)
                chrome.runtime.sendMessage({
                    message: 'user-query',
                    data:JSON.stringify(query_item)
                });
            }
        });
        observer.observe(target, {attributes: true});
    }
}

function get_select_item(){
    query_item={}
    let selectionObj = window.getSelection();
    let selectedText = selectionObj.toString();
    if($.trim(selectedText)){
        query_item.word=$.trim(selectedText);
    } else if($(".sample-source .high-light-bg").length){
        query_item.word=$.trim($(".sample-source .high-light-bg").text());
    }
    if($(".zonedword-content .dictionary-spell").length){
        let phonetic_items=$(".zonedword-content .dictionary-spell").find("span.phonetic-transcription").children("b");
        if(2==phonetic_items.length){
            query_item.uk=phonetic_items[0].innerText;
            query_item.us=phonetic_items[1].innerText;
        }
    }
    //解释信息
    if($(".zonedword-content .dictionary-comment").length){
        query_item.desc_items={}
        $.each($(".zonedword-content .dictionary-comment p"),(index,ele)=>{
            let type=$(ele).children("b").text()
            let info=$(ele).children("span").text()
            query_item.desc_items[type]=info   
        })
    }
    //加入当前学习系列
    query_item.session_id=$('.mdl-navigation__link.selected').attr('id');
    return query_item;
}

function get_query_item(){
    //输入框
    query_item={}
    query_item.word=$("#baidu_translate_input").val();
    //翻译对照框
    query_item.info=$(".ordinary-output.target-output.clearfix").text();
    if($("#left-result-container .dictionary-output").length){
        console.info("dictionary-output")
        //简明释义 apple pear etc...
        //音标信息
        if($(".dictionary-spell").length){
            let phonetic_items=$(".dictionary-spell").find("span.phonetic-transcription").children("b");
            if(2==phonetic_items.length){
                query_item.uk=phonetic_items[0].innerText;
                query_item.us=phonetic_items[1].innerText;
            }
        }
        //解释信息
        console.info("词义："+$(".dictionary-comment").length)
        if($(".dictionary-comment").length){
            query_item.desc_items={}
            $.each($(".dictionary-comment p"),(index,ele)=>{
                let type=$(ele).children("b").text()
                let info=$(ele).children("strong").text()
                query_item.desc_items[type]=info   
            })
        }
    } else if($("#left-result-container .keywords-container").length){
         //第二种情况，句子长，没有其他解释
         console.info("keywords-container")
        //重点词汇 suddenly it hit me how i was going to get back at her
        query_item.key_items=[]
        console.info("keywords:"+$(".keywords-container li").length)
        $.each($(".keywords-container li"),(index,ele)=>{
            query_item.key_items.push({"key":$(ele).children("a").text(),
                                        "info":$(ele).children("span").text()})
        })
    }
    //双语例句
    if($(".double-sample").length){
        query_item.double_samples=[]
        $.each($(".double-sample ol  > li:lt(3)"),(index,ele)=>{
            let source=$(ele).find(".sample-source").text()
            let target=$(ele).find(".sample-target").text()
            let resource=$(ele).find(".sample-resource").text()
            query_item.double_samples.push({"source":source,"target":target,"resource":resource})
        })
    }
    //加入当前学习系列
    query_item.session_id=$('.mdl-navigation__link.selected').attr('id');
    return query_item;
    
}



function session_list_selected(select_id){
    $.each($('.mdl-navigation .mdl-navigation__link'),(index,ele)=>$(ele).removeClass('selected'));
    $(`.mdl-navigation #${select_id}`).addClass('selected');
}



//点击外围让阴影层消失
function dismiss_user_setting(){
    if (event.target.closest(".user-settting")) return;
    let user_setting=$(".user-settting")
    if(user_setting.length){
        user_setting.fadeOut("normal")
    }
    $(this).off("click")
}