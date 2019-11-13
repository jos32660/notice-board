// '2019년 8월 11일 9시 8분 11초' 형식으로 보내주는 함수
function dspDate(d, type){
	var type = typeof type !== 'undefined' ? type : 0;
	var monthArr = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
	var year = d.getFullYear() + "년"; //2019
	var month = monthArr[d.getMonth()]+" "; // 7 (0~11)
	var day = d.getDate() +"일"; //23
	var hour = d.getHours() + "시"; // 0~23
	var min = d.getMinutes() + "분"; //0~59
	var sec = d.getSeconds() + "초"; //0~59
	var returnStr;
	/*
	type 0: 2019년 8월 11일 9시 8분 11초
	type 1: 2019년 8월 11일 9시 8분 
	type 2: 2019년 8월 11일 9시
	type 3: 2019년 8월 11일
	type 4: 8월 11일
	type 5: 11시 12분 12초
	*/

	switch(type){
		case 1:
			returnStr = year + month + day + hour + min;
			break;
		case 2:
				returnStr = year + month + day + hour;
			break;
		case 3:
				returnStr = year + month + day;
			break;
		case 4:
				returnStr = month + day;
			break;
		case 5:
				returnStr = hour + min + sec;
			break;	
		default:
				returnStr = year + month + day + hour + min + sec;
			break;
	}

	return returnStr;
}

function includeHTML() {
  var z, i, elmnt, file, xhttp;
  /* Loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    /*search for elements with a certain atrribute:*/
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      /* Make an HTTP request using the attribute value as the file name: */
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {elmnt.innerHTML = this.responseText;}
          if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
          /* Remove the attribute, and call this function once more: */
          elmnt.removeAttribute("w3-include-html");
          includeHTML();
        }
      } 
      xhttp.open("GET", file, true);
      xhttp.send();
      /* Exit the function: */
      return;
    }
  }
}

includeHTML();

// 사용작 정의 ajax 함수
function ajax (url, type, vals, cb){
	//var data = {}; 													undefined를 보내지 않기위해 빈 객체를 보냄.
	/*
	if(typeof vals === Object) data = vals; // node-req.query
	else url = url+ "/" + vals; 						// node-req.params
	*/
	$.ajax({
		type: type,
		url: url,
		data: vals,
		dataType: "json",
		error: function(xhr, status, error){
			console.log(xhr, status, error);
		},
		success: cb
	});
}

//페이저생성 ()
function pagerMaker($pager, grpCnt, divCnt, total, page, cb){
	var div = divCnt; 								 	 					// 세트당 나올 페이지 수
	var cnt = Math.ceil(total / grpCnt); 					// 전체 페이지 개수
	var stn = 0;      						 								// 세트중에 시작페이지
	var edn = 0;      						 								// 세트중에 마지막페이지
	var prev = 0;      						 								// <를 클릭시 나타날 페이지
	var next = 0;      						 								// >를 클릭시 나타날 페이지
	var prevShow = false;													// << 회색(false), 파란색(true)
	var lastShow = false;													// >> 회색(false), 파란색(true)
	
	var nowIndex = (Math.ceil(page/div) - 1);     // 현재페이지 세트의 index
	var lastIndex = (Math.ceil(cnt/div) -1);      // 페이지 세트의 마지막 index
	
	stn = nowIndex * div +1;  							      // 세트의 시작페이지 값
	if(cnt < stn + div - 1) edn = cnt;
	else edn = stn + div - 1;

	if(nowIndex > 0){
		prevShow = true;
		prev = stn - 1;
	}

	if(lastIndex > nowIndex){
		lastShow = true;
		next = edn + 1;
	}
	/*
	console.log("stn:"+stn);
	console.log("edn:"+edn);
	console.log("lastIndex:"+lastIndex);
	console.log("nowIndex:"+nowIndex);
	*/

	html  = '<li class="page-item page-first '+(prevShow?"":"disabled")+'"data-page="'+prev+'">';
	html += '<span class="page-link"><i class="fas fa-angle-double-left"></i></span>';
	html += '</li>';
	html += '<li class="page-item page-prev '+((page>1)?"":"disabled")+'" data-page="'+((page>1)?(page-1):0)+'">';
	html += '<span class="page-link"><i class="fas fa-angle-left"></i></span>';
	html += '</li>';
	for(var i=stn; i<=edn; i++){
		html += '<li class="page-item page-ct '+(page==i?"active":"")+'" data-page="'+i+'">';
		html += '<span class="page-link">'+i+'</span>';
		html += '</li>';
	}
	html += '<li class="page-item page-next '+(page<cnt?"":"disabled")+'" data-page="'+((page<cnt)?(page+1):0)+'">';
	html += '<span class="page-link"><i class="fas fa-angle-right"></i></span>';
	html += '</li>';
	html += '<li class="page-item page-last '+(lastShow?"":"disabled")+'" data-page="'+next+'">';
	html += '<span class="page-link"><i class="fas fa-angle-double-right"></i></span>';
	html += '</li>';
	$pager.html(html);
	$(".page-item").css({"cursor":"pointer"});
	$(".page-item").click(cb);  //gbook-ajax
}
$(".page-item").click(function(){
	var n = $(this).data("page");
	if(n !== undefined) location.href = $(".pager").data("pager-name")+n;
});

var imgExt = ["jpg", "jpeg", "png", "gif"];
var fileExt = ["hwp", "xls", "xlsx", "ppt", "pptx", "doc", "docx", "txt", "zip", "pdf"];

function splitName(file) {
	var arr = file.split(".");
	var obj = {};
	obj.ext = arr[1];
	obj.name = arr[0];
	return obj;
}

function findPath(d) {
	var year = String(d.getFullYear()).substr(2);	//Number(), d변수로 2019년을 추출, 숫자를 문자열로 바꿈. substr(2) - 2019(0,1,2,3)에서 2번째 자리부터 가져옴. -> 19
	var month = d.getMonth() + 1;
	if(month < 10) month = "0" + month; //0~12월 까지
	return year + month;  //1910
}

function telChk(obj){
	if (String(obj.value).length > 4) {
		obj.value = obj.value.slice(0, 4);
	}
}
