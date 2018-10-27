window.onload=function(){
    chrome.runtime.sendMessage({message: 'get-cookie'});
    $(".sign-in-button").click(()=>{
        set_popup_info()
        let username=$("#username").val();
        let password=$("#password").val();
        chrome.runtime.sendMessage({
            message: 'user-login',
            username: username,
            password: password,
        });
    })
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if("cookie"==request.message){
            if(request.cookie){
                $(".form-content").hide()   
                $(".user-page-info").show()   
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { message: "query-info" });
                });
            } else {
                $(".form-content").show()   
                $(".user-page-info").hide()   
            }
        } else if("page-info"==request.message){
            let query_item=JSON.parse(request.data)
            set_popup_info(query_item)
        } else if("login-complete"==request.message){
            //用户登录成功
            $(".form-content").hide()
            $(".user-page-info").show() 
            if(null!=chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { message: "query-info" });
                }); 
            } else {
                chrome.runtime.sendMessage({ message: "query-info" });
            }
        } 
});

function set_popup_info(query_item){
    if(!query_item) return;
    chrome.storage.local.get(query_item.word, function(result) {
        if(result[query_item.word]){
            $(".query-status").html("cloud")
        }
    });
    $(".word-title").text(query_item.word)
    $(".word-phonetic").text(`UK:${query_item.uk} US:${query_item.us}`)
    $(".word-info").html("")
    if(query_item.desc_items){
        let desc_keys=Object.keys(query_item.desc_items)
        for(let i=0;i<desc_keys.length;i++){
            let key=desc_keys[i]
            let desc=query_item.desc_items[desc_keys[i]]
            $(".word-info").append(`<p>${key} ${desc}</p>`)
        }
    } else if(query_item.key_items){
        let desc_keys=Object.keys(query_item.key_items)
        for(let i=0;i<desc_keys.length;i++){
            let key=desc_keys[i]
            let desc=query_item.key_items[desc_keys[i]]
            $(".word-info").append(`<p>${key} ${desc}</p>`)
        }
    }
    $(".word-example").html("")
    if(query_item.double_samples){
        query_item.double_samples.forEach((item)=>{
            $(".word-example").append(`<a class="mdl-navigation__link">${item["source"]}<br>${item["target"]}</a><br>`)
        })
    }
}