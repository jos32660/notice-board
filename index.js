//app 실행
const express = require("express");
const app = express();
const port = 8080;
app.listen(port, () => {
	console.log("http://127.0.0.1:"+port);
});

//node_modules 참조
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const session = require("express-session");
const store = require("session-file-store")(session);

//modules 참조
const util = require("./modules/util");
const db = require("./modules/mysql_conn");
const pager = require("./modules/pager");
const mt = require("./modules/multer_conn");

//전역변수 선언
const sqlPool = db.sqlPool; 
const sqlExec = db.sqlExec;
const sqlErr = db.sqlErr;
const mysql = db.mysql;
const salt = "My Password Key";
var loginUser = {};

//app 초기화
app.use("/", express.static("./public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
	secret : salt,
	resave: false,
	saveUninitialized: true,
	store: new store()
}));
app.set("view engine", "pug");
app.set("views", "./views");
app.locals.pretty = true;


//router 영역 - GET

// http://127.0.0.1:3000/page
// http://127.0.0.1:3000/page/1
app.get(["/page","/page/:page"], (req, res) => {
	var page = req.params.page; 
	if(!page) page = "Unselected";
	var title = "Book list";
	var css = "page";
	var js = "page";
	var vals = {page, title, css, js, loginUser};
	res.render("page",vals);
});

//방명록을 node.js 개발자가 전부 만드는 방식
/*
type: /in - 방명록 작성
type: /li/1(id - page) - 방명록 리스트 보기
type: /up/1(id) - 선택된 방명록 수정
type: /rm/1(id) - 선택된 방명록 삭제
*/
app.get(["/gbook", "/gbook/:type", "/gbook/:type/:id"],(req, res) => {
	/* req.session.user = {id: userid, name: username, grade: grade} */
	//loginUser = req.session.user; // login: userid, 미login: undefined;
	var type = req.params.type;
	var id = req.params.id;
	if(!util.nullChk(type)) type = "li";
	if(!util.nullChk(type)) type = "li2";
	if(type === "li" && !util.nullChk(id)) id = 1;
	if(type === "li2" && !util.nullChk(id)) id = 1;
	if(!util.nullChk(id) && type !== "in" && !util.nullChk(id) && type !== "in2") res.redirect("/404.html");
	var vals = {
		css: "gbook",
		js: "gbook",
		loginUser: req.session.user
	}
	var vals2 = {
		css: "main",
		js: "main",
		loginUser: req.session.user
	}
	var pug;
	var sql;
	var sqlVal;
	var result;
	switch(type){
		case "in":
			vals.title = "Gest book write";
			pug = "gbook_in";
			res.render(pug, vals);
			break;
		case "in2":
			vals2.title = "Oui Oui Board write";
			pug = "gbook2_in";
			res.render(pug, vals2);
			break;
		case "li2" :
			(async () => {
				var totCnt = 0;
				var page = id;
				var divCnt = 3; 
				var grpCnt = 5;
				sql = "SELECT count(ID) FROM gbook";
				result = await sqlExec(sql);
				totCnt = result[0][0]["count(ID)"];
				const pagerVal = pager.pagerMaker({totCnt, page, grpCnt});
				pagerVal.link = "/gbook/li2/";
				sql = "SELECT * FROM gbook ORDER BY ID DESC limit ?, ?";
				sqlVal = [pagerVal.stRec, pagerVal.grpCnt];
				result = await sqlExec(sql, sqlVal);
				vals2.datas = result[0];
				for(let item of vals2.datas) item.useIcon = util.iconChk(item.wtime,item.savefile);
				vals2.title = "Oui Oui site";
				vals2.pager = pagerVal;
				for(let item of vals2.datas) item.wtime = util.dspDate(new Date(item.wtime));
				pug = "gbook2";
				res.render(pug, vals2);
			})();
			break;
		case "li":
			//() => {} : {}를 실행
			//(() => {})() : ({}를 실행)를 즉시 실행
			(async () => {
				var totCnt = 0;
				var page = id;
				var divCnt = 3; 
				var grpCnt = 5;
				// if(grpCnt === undefined || typeof grpCnt!=="number") grpCnt = 5;
				//http://127.0.0.1:3000/gbook/li/1(page)?grpCnt=5(list갯수)
				sql = "SELECT count(ID) FROM gbook";
				result = await sqlExec(sql);
				totCnt = result[0][0]["count(ID)"];
				const pagerVal = pager.pagerMaker({totCnt, page, grpCnt});
				pagerVal.link = "/gbook/li/";
				sql = "SELECT * FROM gbook ORDER BY ID DESC limit ?, ?";
				sqlVal = [pagerVal.stRec, pagerVal.grpCnt];
				result = await sqlExec(sql, sqlVal);
				vals.datas = result[0];
				for(let item of vals.datas) item.useIcon = util.iconChk(item.wtime,item.savefile);
				vals.title = "Gest book";
				vals.pager = pagerVal;
				for(let item of vals.datas) item.wtime = util.dspDate(new Date(item.wtime));
				pug = "gbook";
				res.render(pug, vals);
			})();
			break;
			/*
			sqlExec(sql).then((data) => {
				vals.datas = data[0];
				vals.title = "Gest book";
				pug = "gbook";
				for(let item of data[0]) item.wtime = util.dspDate(new Date(item.wtime));
				res.render(pug, vals);
			}).catch(sqlErr);
			break;
			*/
		default:
			res.redirect("/500.html");
			break;
	}
});

//http://127.0.0.1/api/modalData?id=7
//http://127.0.0.1/api/remove?id=7&pw=00000000
app.get("/api/:type", (req, res) => {
	var type = req.params.type;
	var id = req.query.id;
	var sql;
	var vals = [];
	var result;
	switch(type){
		case "modalData":
			if(id === undefined) res.redirect("/500.html");
			else{
				sql = "SELECT * FROM gbook WHERE ID=?";
				vals.push(id);
				(async () => {
					result = await sqlExec(sql, vals);
					res.json(result[0][0]);
				})();
			}
			break;
		default:
			res.redirect("/404.html");
			break;
	}
});

app.post("/api/:type", mt.upload.single("upfile"), (req, res) => {
	var type = req.params.type;
	var id = req.body.id;
	var pw = req.body.pw;
	var writer = req.body.writer;
	var comment = req.body.comment;
	var page = req.body.page;
	var sql = "";
	var vals = [];
	var result;
	var obj = {};
	var orifile = "";
	var savefile = "";
	var oldfile = "";
	if(req.file) {
		orifile = req.file.originalname;
		savefile = req.file.filename;
	}
	switch(type) {
		case "remove":
			if((id != undefined && pw != undefined) || (req.session.user && id !=undefined)){
				(async () => {
					// 첨부파일 가져오기
					sql = "SELECT savefile FROM gbook WHERE id="+id;
					result = await sqlExec(sql);
					savefile = result[0][0].savefile;
					// 실제 데이터베이스 삭제
					vals.push(id);
					if(req.session.user){
						if(req.session.user.grade == 9) {
							sql = "DELETE FROM gbook WHERE id=?";
						}
						else {
							vals.push(req.session.user.id);
							sql = "DELETE FROM gbook WHERE id=? AND userid=?";
						}
					}
					else {
						vals.push(pw);
						sql = "DELETE FROM gbook WHERE id=? AND pw=?";
					}
					result = await sqlExec(sql, vals);
					if(result[0].affectedRows == 1) {
						// 파일삭제
						if(util.nullChk(savefile)) fs.unlinkSync(path.join(__dirname, "/public/uploads/"+mt.getDir(savefile)+"/"+savefile));
						// 삭제결과 리턴
						if(req.session.user) res.json({code: 200});
						else {
							obj.msg = "삭제되었습니다.";
							obj.loc = "/gbook/li2/"+page;
							res.send(util.alertLocation(obj));
						}
					}
					else {
						if(req.session.user) res.json({code: 500});
						else {
							obj.msg ="패스워드가 올바르지 않습니다.";
							obj.loc = "/gbook/li2/"+page;
							res.send(util.alertLocation(obj));
						}
					}
					// history.go(-1); <-이전페이지로 돌아가기
					// res.json(result);
				})();
			}
			else res.redirect("/500.html");
			break;
		case "update":
			if((id != undefined && pw != undefined) || (req.session.user && id !=undefined)) {
				vals.push(writer);	//0
				vals.push(comment);	//1
				if(req.file) vals.push(orifile);	//2
				if(req.file) vals.push(savefile);	//3
				vals.push(id);	//4
				(async () => {
					// 첨부파일 가져오기
					sql = "SELECT savefile FROM gbook WHERE id="+id;
					result = await sqlExec(sql);
					oldfile = result[0][0].savefile;
					// 실제 데이터 수정
					sql="UPDATE gbook SET writer=?, comment=? ";		//0, 1
					if(req.file) sql += ", orifile=?, savefile=? ";	//2, 3
					if(req.session.user){
						if(req.session.user.grade == 9) sql += " WHERE id=?"; //4
						else {
							vals.push(req.session.user.id);
							sql += " WHERE id=? AND userid=?"; //4, 5
						}
					}
					else {
						vals.push(pw);
						sql += " WHERE id=? AND pw=?"; //4, 5
					}
					//res.json({sql, vals});
					result = await sqlExec(sql, vals);
					if(result[0].affectedRows == 1) {
						obj.msg = "수정되었습니다.";
						// 기존 파일 삭제하기
						if(req.file && util.nullChk(oldfile)) fs.unlinkSync(path.join(__dirname, "/public/uploads/"+mt.getDir(oldfile)+"/"+oldfile));
					}
					else {
						if(req.session.user) obj.msg = "수정이 실행되지 않았습니다.";
						else obj.msg = "패스워드가 올바르지 않습니다.";
					}
					obj.loc = "/gbook/li/"+page;
					obj.loc = "/gbook/li2/"+page;
					res.send(util.alertLocation(obj));
					// if(result[0].changedRows < 1)
				})();
			}
			else res.redirect("/500.html");
			break;
		default:
			res.redirect("/404.html");
			break;
	}
});

// File download Route
app.get("/download", (req, res) => {
	const downName = req.query.downName; // 업로드 될때의 파일명 (ex: desert.jpg)
	const fileName = path.join(__dirname, "/public/uploads/"+mt.getDir(req.query.fileName)+"/") + req.query.fileName; // 실제 저장된 파일명 (ex: ts-00.jpg)
	res.download(fileName, downName);
});

// 방명록 Ajax로 구현
// 방명록을 Ajax 통신으로 데이터만 보내주는 방식
app.get("/gbook_ajax", (req, res) => {
	// loginUser = req.session.user;
	// var ajax = req.params.ajax;
	const title = "Gest book-ajax";
	const css = "gbook_ajax";
	const js = "gbook_ajax";
	const vals = {title, css, js, loginUser: req.session.user};
	res.render("gbook_ajax", vals);
});

// http://127.0.0.1:3000/gbook_ajax/1?grpCnt=10
app.get("/gbook_ajax/:page", (req, res) => {
	var page = Number(req.params.page);					//1
	var grpCnt = Number(req.query.grpCnt);			//10//한 페이지에 보여질 목록 갯수
	var stRec = (page - 1) * grpCnt;						//목록을 가져오기 위해 목록의 시작 INDEX
	var vals = [];															//query에 보내질 ? 값
	// var reData = [];														//res.json(reData)
	var sql;
	var result;
	var reData = {};
	(async () =>{
	//총 페이지 수 가져오기
		sql = "SELECT count(ID) FROM gbook";
		result = await sqlExec(sql);
		reData.totCnt = result[0][0]["count(ID)"];

		//레코드 가져오기
		sql = "SELECT * FROM gbook ORDER BY ID DESC LIMIT ?, ?";
		vals = [stRec, grpCnt];
		result = await sqlExec(sql, vals);
		reData.rs = result[0];
		res.json(reData);
	})();
});

//router 영역 - POST
app.post("/gbook_save", mt.upload.single("upfile"), (req, res) => {
	var writer = req.body.writer;   //body-parser의 body를 POST, form의 name의 writer
	var comment = req.body.comment; //body-parser의 body를 POST, form의 name의 comment
	var pw = "";					  				//body-parser의 body를 POST, form의 name의 pw
	var userid = "";
	if(req.session.user) userid = req.session.user.id;
	else pw = req.body.pw;
	var orifile = "";
	var savefile = "";
	if(req.file) {
		orifile = req.file.originalname;
		savefile = req.file.filename;
	}
	var result;

	var sql = "INSERT INTO gbook SET comment=?, wtime=?, writer=?, pw=?, orifile=?, savefile=?, userid=?";
	var vals = [comment, util.dspDate(new Date()), writer, pw, orifile, savefile, userid];
	(async () => {
		result = await sqlExec(sql, vals);
		if(result[0].affectedRows > 0) {
			if(req.fileValidateError === false) {
				res.send(util.alertLocation({
					msg:"허용되지 않는 파일형식 이므로 파일을 업로드 하지 않았습니다. 첨부파일을 제외한 내용은 저장되었습니다.",
					loc: "/gbook"
				}));
			}
			else res.redirect("/gbook");
		}
		else res.redirect("/500.html");
	})();
});
app.post("/gbook2_save", mt.upload.single("upfile"), (req, res) => {
	var writer = req.body.writer;   //body-parser의 body를 POST, form의 name의 writer
	var comment = req.body.comment; //body-parser의 body를 POST, form의 name의 comment
	var pw = "";					  				//body-parser의 body를 POST, form의 name의 pw
	var userid = "";
	if(req.session.user) userid = req.session.user.id;
	else pw = req.body.pw;
	var orifile = "";
	var savefile = "";
	if(req.file) {
		orifile = req.file.originalname;
		savefile = req.file.filename;
	}
	var result;

	var sql = "INSERT INTO gbook SET comment=?, wtime=?, writer=?, pw=?, orifile=?, savefile=?, userid=?";
	var vals = [comment, util.dspDate(new Date()), writer, pw, orifile, savefile, userid];
	(async () => {
		result = await sqlExec(sql, vals);
		if(result[0].affectedRows > 0) {
			if(req.fileValidateError === false) {
				res.send(util.alertLocation({
					msg:"허용되지 않는 파일형식 이므로 파일을 업로드 하지 않았습니다. 첨부파일을 제외한 내용은 저장되었습니다.",
					loc: "/gbook/li2"
				}));
			}
			else res.redirect("/gbook/li2");
		}
		else res.redirect("/500.html");
	})();
});

/* 회원가입 및 로그인 등 */

/* 회원가입 라우터 */
app.get(["/mem/:type", "/mem/:type/:id"], memEdit); // 회원가입, 아이디/비번찾기, 회원리스트, 회원정보, 로그인, 로그아웃
app.get(["/main/:type", "/main/:type/:id"], mainEdit); // 회원가입, 아이디/비번찾기, 회원리스트, 회원정보, 로그인, 로그아웃
app.post("/api-mem/:type", memApi); // 회원가입시 각종 Ajax
app.post("/mem/join", memJoin); 		// 회원가입 저장
app.post("/main/join", mainJoin); 		// 회원가입 저장2
app.post("/mem/login", memLogin); 	//회원 로그인 모듈 
app.post("/main/login", mainLogin); 	//회원 로그인 모듈 
app.post("/mem/update", memUpdate); //회원 정보 수정 
app.post("/main/update", mainUpdate); //회원 정보 수정 



/* 함수구현 - GET */
function memEdit(req, res) {
	// loginUser = req.session.user;
	const type = req.params.type;
	const vals = {css: "mem", js: "mem" , loginUser: req.session.user};
	switch (type) {
		case "join":
			vals.title = "Sign In";
			vals.tel = util.telNum;
			res.render("mem_in", vals);
			break;
		case "login":
			vals.title = "Login";
			res.render("mem_login", vals);
			break;
		case "logout":
			req.session.destroy();
			res.redirect("/");
			break;
		case "edit":
			(async () => {
				sql = "SELECT * FROM member WHERE userid='"+req.session.user.id+"'";
				result = await sqlExec(sql);
				vals.title = "Gest Edit";
				vals.myData = result[0][0];
				vals.tel = util.telNum;
				res.render("mem_up", vals);
			})();
			break;
		case "remove":
			if(util.adminChk(req.session.user)) {
				var id = req.query.id;
				(async () => {
					sql = "DELETE FROM member WHERE id="+id;
					result = await sqlExec(sql);
					if(result[0].affectedRows == 1) res.send(util.alertLocation({
						msg: "삭제되었습니다.",
						loc: "/mem/list"
					}));
					else res.send(util.alertLocation({
						msg: "삭제가 실패하였습니다.",
						loc: "/mem/list"
					}));
				})();
			}
			else res.send(util.alertAdmin());
			break;
		case "list":
			var totCnt = 0;
			var page = req.params.id;
			var divCnt = 3; 
			var grpCnt = 5;
			if(!util.nullChk(page)) page = 1;
			vals.title = "Gest List - admin";
			(async () => {
				sql = "SELECT count(id) FROM member";
				result = await sqlExec(sql);
				totCnt = result[0][0]["count(id)"];
				const pagerVal = pager.pagerMaker({totCnt, page, grpCnt});
				pagerVal.link = "/mem/list/";
				sql = "SELECT * FROM member ORDER BY id DESC limit ?, ?";
				result = await sqlExec(sql, [pagerVal.stRec, pagerVal.grpCnt]);
				vals.lists = result[0];
				vals.pager = pagerVal;
				if(util.adminChk(req.session.user)) res.render("mem_list", vals);
				else res.send(util.alertAdmin());
			})();
			break;
	}
}
function mainEdit(req, res) {
	// loginUser = req.session.user;
	const type = req.params.type;
	const vals = {css: "main", js: "mem" , loginUser: req.session.user};
	switch (type) {
		case "join":
			vals.title = "Sign In";
			vals.tel = util.telNum;
			res.render("main_in", vals);
			break;
		case "login":
			vals.title = "Login";
			res.render("main_login", vals);
			break;
		case "logout":
			req.session.destroy();
			res.redirect("/gbook/li2");
			break;
		case "edit":
			(async () => {
				sql = "SELECT * FROM member WHERE userid='"+req.session.user.id+"'";
				result = await sqlExec(sql);
				vals.title = "User Edit";
				vals.myData = result[0][0];
				vals.tel = util.telNum;
				res.render("main_up", vals);
			})();
			break;
		case "remove":
			if(util.adminChk(req.session.user)) {
				var id = req.query.id;
				(async () => {
					sql = "DELETE FROM member WHERE id="+id;
					result = await sqlExec(sql);
					if(result[0].affectedRows == 1) res.send(util.alertLocation({
						msg: "삭제되었습니다.",
						loc: "/main/list"
					}));
					else res.send(util.alertLocation({
						msg: "삭제가 실패하였습니다.",
						loc: "/main/list"
					}));
				})();
			}
			else res.send(util.alertAdmin());
			break;
		case "list":
			var totCnt = 0;
			var page = req.params.id;
			var divCnt = 3; 
			var grpCnt = 5;
			if(!util.nullChk(page)) page = 1;
			vals.title = "User List - admin";
			(async () => {
				sql = "SELECT count(id) FROM member";
				result = await sqlExec(sql);
				totCnt = result[0][0]["count(id)"];
				const pagerVal = pager.pagerMaker({totCnt, page, grpCnt});
				pagerVal.link = "/main/list/";
				sql = "SELECT * FROM member ORDER BY id DESC limit ?, ?";
				result = await sqlExec(sql, [pagerVal.stRec, pagerVal.grpCnt]);
				vals.lists = result[0];
				vals.pager = pagerVal;
				if(util.adminChk(req.session.user)) res.render("main_list", vals);
				else res.send(util.alertAdmin());
			})();
			break;
	}
}

/* 함수구현 - POST */
function memApi(req, res){
	const type = req.params.type;
	var sql = "";
	var sqlVals = [];
	switch(type) {
		case "userid":
			const userid = req.body.userid;
			(async () => {
				sql = "SELECT count(id) FROM member WHERE userid=?";
				sqlVals.push(userid);
				result = await sqlExec(sql, sqlVals);
				if(result[0][0]["count(id)"] > 0) res.json({chk: false});
				else res.json({chk: true});
			})();
			break;
	}
}

// 회원가입저장
function memJoin(req, res){
	const vals = [];
	var userpw = crypto.createHash("sha512").update(req.body.userpw + salt).digest("base64");
	vals.push(req.body.userid);
	vals.push(userpw);
	vals.push(req.body.username);
	vals.push(req.body.tel1 + "-" +req.body.tel2 + "-" + req.body.tel3);
	vals.push(req.body.post);
	vals.push(req.body.addr1 + req.body.addr2);
	vals.push(req.body.addr3);
	vals.push(new Date());
	vals.push(2);
	var sql = "";
	var result = {};
	(async () => {
		sql = "INSERT INTO member SET userid=?, userpw=?, username=?, tel=?, post=?, addr1=?, addr2=?, wtime=?, grade=?";
		result = await sqlExec(sql, vals);
		res.send(util.alertLocation({
			msg: "회원으로 가입되었습니다.",
			loc: "/mem/login"
		}));
	})();
}
function mainJoin(req, res){
	const vals = [];
	var userpw = crypto.createHash("sha512").update(req.body.userpw + salt).digest("base64");
	vals.push(req.body.userid);
	vals.push(userpw);
	vals.push(req.body.username);
	vals.push(req.body.tel1 + "-" +req.body.tel2 + "-" + req.body.tel3);
	vals.push(req.body.post);
	vals.push(req.body.addr1 + req.body.addr2);
	vals.push(req.body.addr3);
	vals.push(new Date());
	vals.push(2);
	var sql = "";
	var result = {};
	(async () => {
		sql = "INSERT INTO member SET userid=?, userpw=?, username=?, tel=?, post=?, addr1=?, addr2=?, wtime=?, grade=?";
		result = await sqlExec(sql, vals);
		res.send(util.alertLocation({
			msg: "회원으로 가입되었습니다.",
			loc: "/main/login"
		}));
	})();
}

// 회원정보수정
function memUpdate(req, res){
	const vals = [];
	var userpw = crypto.createHash("sha512").update(req.body.userpw + salt).digest("base64");
	vals.push(userpw);
	vals.push(req.body.username);
	vals.push(req.body.tel1 + "-" +req.body.tel2 + "-" + req.body.tel3);
	vals.push(req.body.post);
	vals.push(req.body.addr1 + " " + req.body.addr2);
	vals.push(req.body.addr3);
	vals.push(req.session.user.id);
	var sql = "";
	var result = {};
	(async () => {
		sql = "UPDATE member SET userpw=?, username=?, tel=?, post=?, addr1=?, addr2=? WHERE userid=?";
		result = await sqlExec(sql, vals);
		if(result[0].affectedRows == 1) res.send(util.alertLocation({
			msg: "정보가 수정되었습니다.",
			loc: "/"
		}));
	})();
}
function mainUpdate(req, res){
	const vals = [];
	var userpw = crypto.createHash("sha512").update(req.body.userpw + salt).digest("base64");
	vals.push(userpw);
	vals.push(req.body.username);
	vals.push(req.body.tel1 + "-" +req.body.tel2 + "-" + req.body.tel3);
	vals.push(req.body.post);
	vals.push(req.body.addr1 + " " + req.body.addr2);
	vals.push(req.body.addr3);
	vals.push(req.session.user.id);
	var sql = "";
	var result = {};
	(async () => {
		sql = "UPDATE member SET userpw=?, username=?, tel=?, post=?, addr1=?, addr2=? WHERE userid=?";
		result = await sqlExec(sql, vals);
		if(result[0].affectedRows == 1) res.send(util.alertLocation({
			msg: "정보가 수정되었습니다.",
			loc: "/gbook/li2"
		}));
	})();
}

/* 로그인 처리 모듈 */
function memLogin(req, res) {
	var userid =  req.body.loginid;
	var userpw =  req.body.loginpw;
	var result;
	var sql = "";
	var vals = [];
	userpw = crypto.createHash("sha512").update(userpw + salt).digest("base64");
	(async () => {
		sql = "SELECT * FROM member WHERE userid=? AND userpw=?";
		vals.push(userid);
		vals.push(userpw);
		result = await sqlExec(sql, vals);
		if(result[0].length == 1) {
			req.session.user = {};
			req.session.user.id = userid;
			req.session.user.name = result[0][0].username;
			req.session.user.grade = result[0][0].grade;
			res.redirect("/");
		}
		else if(result[0].length == 0) {
			req.session.destroy();
			res.send(util.alertLocation({
				msg: "아이디와 패스워드가 일치하지 않습니다.",
				loc: "/main/login"
			}));
		}
		else {
			req.session.destroy();
			res.send(util.alertLocation({
				msg: "아이디와 패스워드가 일치하지 않습니다.",
				loc: "/mem/login"
			}));
		}
	})();
}
function mainLogin(req, res) {
	var userid =  req.body.loginid;
	var userpw =  req.body.loginpw;
	var result;
	var sql = "";
	var vals = [];
	userpw = crypto.createHash("sha512").update(userpw + salt).digest("base64");
	(async () => {
		sql = "SELECT * FROM member WHERE userid=? AND userpw=?";
		vals.push(userid);
		vals.push(userpw);
		result = await sqlExec(sql, vals);
		if(result[0].length == 1) {
			req.session.user = {};
			req.session.user.id = userid;
			req.session.user.name = result[0][0].username;
			req.session.user.grade = result[0][0].grade;
			res.redirect("/gbook/li2");
		}
		else {
			req.session.destroy();
			res.send(util.alertLocation({
				msg: "아이디와 패스워드가 일치하지 않습니다.",
				loc: "/main/login"
			}));
		}
	})();
}