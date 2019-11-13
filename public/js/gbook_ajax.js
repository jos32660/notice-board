/*
//Javascript Ajax
var page = 1
var url = "/gbook_ajax/" + page;
var xhr = new XMLHttpRequest();
xhr.open("GET", url);
xhr.send(data);

xhr.addEventListener('load', function(){
	console.log(xhr.responseText);
});
*/

//ajax("/gbook_ajax", {page: 1});
function getPage(page){
	var grpCnt = 5;
	var divCnt = 3;
	ajax("/gbook_ajax/"+page, "get", {grpCnt: grpCnt}, function (data){
		console.log(data);
		/*
		{totCnt: 2,
		rs:[
			{ID:..., comment:, writer:, wtime:},
			{ID:..., comment:, writer:, wtime:}
		]
	}
		*/
		var totCnt = data.totCnt; //2
		var rs = data.rs; 
		var html = '';
		$(".gbook-tb > tbody").empty();
		for(var i in rs){
			html  = '<tr>';
			html += '<td>'+rs[i].ID+'</td>';
			html += '<td>'+rs[i].writer+'</td>';
			html += '<td>'+dspDate(new Date(rs[i].wtime))+'</td>';
			html += '<td>'+rs[i].comment+'</td>';
			html += '<td>';
			html += '<button class="btn btn-secondary btn-sm mx-2">수정</button>';
			html += '<button class="btn btn-danger btn-sm">삭제</button>';
			html += '</td>';
			html += '</tr>';
			$(".gbook-tb > tbody").append(html);
		}
		//pagerMaker($pager, grpCnt, totCnt, page)
		pagerMaker($(".pager"), grpCnt, divCnt, totCnt, page, function(){
			if(!$(this).hasClass("disabled")) getPage($(this).data("page"));
		});
	});
}
getPage(1);