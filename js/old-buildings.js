import { createApp } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 宣告全域變數以供所有相關函式存取
let scene, renderer, defaultCamera, currentCamera, controls, raycaster, mouse;
let loadedModel = null; // 確保 loadedModel 有初始值
let isFirstPersonMode = false;
let firstPersonRotationX = 0;
let firstPersonRotationY = 0;
let previousMouseX = 0;
let previousMouseY = 0;
let isDragging = false;
let navCameras = {}; // 宣告為全域變數，並在 mounted 中填充
let isTransitioning = false;

// 導覽攝影機的設定 (Moved to global scope)
let cameraNav1, cameraNav2, cameraNav3, cameraNav4, cameraNav5, cameraNav6, cameraNav7, cameraNav8, cameraNav9, cameraNav10, cameraNav11, cameraNav12;

// 宣告互動物件相關的全域變數
const targetObjectNames = ["我是標示點1", "我是標示點2"]; // 宣告為全域常數
const highlightableNames = ["我是標示點1", "我是標示點2", "畫框01", "畫框02", "畫框03", "畫框04", "畫框05", "畫框06", "畫框07", "畫框08", "桌子", "大門"]; // 宣告為全域常數
const frameNames = ["畫框01", "畫框02", "畫框03", "畫框04"]; // 宣告為全域常數
const highlightableObjects = []; // 宣告為全域變數
let currentHoveredObject = null; // 宣告為全域變數
let originalEmissive = new Map(); // 宣告為全域變數

createApp({
    data() {
        return {
            // loading 與初始化流程
            loadingProgress: 0,
            instructionStep: 0,
            isInitialized: false,
            // showInstruction: true, // ✅ 遮罩初始顯示

            // 彈窗控制
            showInfoModal: false,
            infoModalTitle: '',
            infoModalContent: '',
            infoModalButtonText: '進入參觀',
            showModalButton: true,
            modalAction: '',

            // 選單與導覽狀態
            isMenuOpen: false,
            selectedAction: '',
            actionMessage: '',

            showImageCarousel: false,
            carouselImages: [],
            currentImageIndex: 0,
        };
    },
    methods: {
        goToImage(index) {
            this.currentImageIndex = index;
        },
        
        updateLoadingUI() {
            const percentText = document.getElementById('progressPercentage');
            const barFill = document.querySelector('.progress-bar-fill');
            if (percentText && barFill) {
                percentText.innerText = `${this.loadingProgress}%`;
                barFill.style.width = `${this.loadingProgress}%`;
            }
        },
        showSecondMask() {
            this.instructionStep = 2;
        },
        hideInstruction() {
            this.instructionStep = null;
            this.isInitialized = true;
        },

        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
            if (controls) {
                controls.enabled = !this.isMenuOpen;
                if (this.isMenuOpen) {
                    console.log('選單已開啟，OrbitControls 已禁用。');
                } else {
                    console.log('選單已關閉，OrbitControls 已重新啟用。');
                }
            }
            if (this.isMenuOpen) {
                this.selectedAction = 'menu';
                this.actionMessage = '選單已開啟';
            }
        },
        handleNavClick(action) {
            this.selectedAction = action;
            if (action === 'import') {
                window.location.href = 'topic.html';
                this.actionMessage = '回到前頁已點擊';
            } else if (action === 'navigation') {
                this.actionMessage = '進入導覽已點擊';
            } else if (action === 'backToMain') {
                window.location.href = 'topic.html';
            } else if (action === 'goHome') {
                window.location.href = 'index.html';
                this.actionMessage = '返回首頁';
            }
            if (this.isMenuOpen) {
                this.isMenuOpen = false;
            }
        },
        prevImage() {
            if (this.currentImageIndex > 0) {
                this.currentImageIndex--;
            } else {
                this.currentImageIndex = this.carouselImages.length - 1;
            }
        },
        nextImage() {
            if (this.currentImageIndex < this.carouselImages.length - 1) {
                this.currentImageIndex++;
            } else {
                this.currentImageIndex = 0;
            }
        },
        closeInfoModal() {
            this.showInfoModal = false;
            isTransitioning = false;
            if (controls) {
                controls.enabled = true;
                controls.update();
                console.log('資訊彈出視窗已關閉，OrbitControls 已重新啟用。');
            }
        },
        switchToCamera(cameraName) {
            const targetCameraConfig = navCameras[Object.keys(navCameras).find(key => navCameras[key].camera.name === cameraName)];

            if (targetCameraConfig && targetCameraConfig.camera) {
                const targetCamera = targetCameraConfig.camera;
                const targetIsFirstPersonMode = targetCameraConfig.isFirstPerson;

                currentCamera = targetCamera;

                console.log(`切換目標攝影機 ${cameraName} 的宣告位置:`, targetCamera.position);

                controls.enabled = false;
                isFirstPersonMode = targetIsFirstPersonMode;

                isTransitioning = true;
                gsap.to(currentCamera.position, {
                    duration: 1.5,
                    x: targetCamera.position.x,
                    y: targetCamera.position.y,
                    z: targetCamera.position.z,
                    ease: "power2.inOut",
                    onComplete: function () {
                        if (!isTransitioning) return;
                        console.log(`攝影機已切換到 ${cameraName}，位置:`, currentCamera.position);
                        console.log(`攝影機已切換到 ${cameraName}，旋轉:`, currentCamera.rotation);
                    }
                });

                const targetRotationX = targetIsFirstPersonMode ? targetCameraConfig.initialRotationX : targetCamera.rotation.x;
                const targetRotationY = targetIsFirstPersonMode ? targetCameraConfig.initialRotationY : targetCamera.rotation.y;
                const targetRotationZ = targetIsFirstPersonMode ? 0 : targetCamera.rotation.z;

                gsap.to(currentCamera.rotation, {
                    duration: 1.5,
                    x: targetRotationX,
                    y: targetRotationY,
                    z: targetRotationZ,
                    ease: "power2.inOut",
                    onComplete: function () {
                        if (!isTransitioning) return;
                        if (isFirstPersonMode) {
                            firstPersonRotationX = targetRotationX;
                            firstPersonRotationY = targetRotationY;
                            isTransitioning = false;
                        }
                        console.log(`攝影機已切換到 ${cameraName}，最終旋轉: X=${currentCamera.rotation.x.toFixed(2)}, Y=${currentCamera.rotation.y.toFixed(2)}, Z=${currentCamera.rotation.z.toFixed(2)}`);
                        console.log(`使用的 initialRotationX: ${targetRotationX.toFixed(2)}, initialRotationY: ${targetRotationY.toFixed(2)}`);
                    }
                });
            } else {
                console.warn(`無法找到名為 ${cameraName} 的攝影機配置。`);
            }
        },
        closeInfoModal() {
            this.showInfoModal = false;
            isTransitioning = false;
            // 重新啟用 OrbitControls
            if (controls) { // 檢查 controls 是否已定義
                controls.enabled = true;
                controls.update();
                console.log('資訊彈出視窗已關閉，OrbitControls 已重新啟用。');
            }
        },
        // *** 修改開始：showFrameInfo 方法新增 clickedObject 參數 ***
        showFrameInfo(itemName, clickedObject = null) {
            if (isTransitioning) {
                console.log('跳過 showFrameInfo，因為動畫尚未完成。');
                return;
            }
            // 禁用 OrbitControls
            if (controls) { // 檢查 controls 是否已定義
                controls.enabled = false;
                console.log('OrbitControls 已禁用。');
            }

            let displayTitle = itemName; // 預設使用傳入的 itemName
            let displayContent = '沒有找到該物件的介紹資訊。';

            // 如果傳入了 clickedObject 且它有 customDisplayName，則優先使用 customDisplayName 作為標題
            if (clickedObject) {
                let parent = clickedObject;
                while (parent) {
                    if (parent.userData && parent.userData.customDisplayName) {
                        displayTitle = parent.userData.customDisplayName;
                        break;
                    }
                    parent = parent.parent;
                }
            }

            // 根據原始物件名稱設定不同的內容 (這裡保持您現有的邏輯，用 itemName 來判斷)
            this.showImageCarousel = false;
            this.carouselImages = [];
            this.currentImageIndex = 0;

            switch (itemName) {
                case '畫框01':
                    displayContent = [
                        "<br>松山文創園區坐落於台北市信義區，前身為台灣總督府專賣局松山菸草工場，興建於1937年日治時期，是台灣現代化工業廠房的先驅，在菸酒專賣時代對國庫貢獻良多。1998年因市場開放與公賣制度改革而停止生產。2001年，台北市政府將其指定為第99處市定古蹟，自此開啟了老建築再利用的嶄新篇章。",
                        "<br><br>老建築再利用與當下使用：\n松山菸廠的建築群以「日本初現代主義」風格建造，結合簡潔俐落的結構與典雅的細節，廠區規劃時即導入「工業村」概念，附設完整的員工福利設施。如今，這些富有歷史底蘊的老建築已獲得活化新生，成為推動文化創意產業的重要基地：",
                        "<br><br>製菸工廠 (Tobacco Factory)：園區內最大主體建築，原為捲菸作業場，現已轉型為文創產業的展示與創意平台，承載各式展覽與活動。",
                        "<br>倉庫群 (Warehouses 1-5)：這些曾用於儲存菸草成品的倉庫，現在是重要的跨界展演空間，舉辦多元的藝文活動。",
                        "<br>鍋爐房 (Boiler Room)：過去提供菸廠動力的鍋爐房，其高聳的煙囪曾是台北東區的地標，見證著產業發展的歷程。",
                        "<br>不只是圖書館 (Not Just Library)：由昔日的育嬰室與澡堂活化而成，提供獨特的閱讀與文化體驗，被譽為「書浴」的創新空間。",
                        "<br>多功能展演廳 (Auditorium)：原為員工用餐、集會及籃球活動的大禮堂，現已改建為寬敞的多功能展演空間，適合舉辦各類藝文演出。",
                        "<br>生態景觀池 (Ecological Landscape Pond)：園區內的大型水池原為消防蓄水池，現已整頓為生態濕地，保留多樣的保育植物，是城市中難得的綠色空間。",
                        "<br>巴洛克花園：位居園區中央，增添了整體環境的浪漫與綠意。",
                        "<br><br>松山文創園區成功地將歷史工業遺產轉化為兼具文化、藝術、設計與休憩功能的複合式園區，不僅保留了舊時代的風貌，更注入了當代的創意活力，成為台北市重要的文化地標。"
                    ].join('\n\n');
                    this.infoModalButtonText = '查看更多畫作';
                    this.modalAction = 'viewArtwork';
                    this.showModalButton = false;
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/01-01.jpg',
                        './img/old-buildings/01-02.jpg'

                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框02':
                    displayContent = [
                        "<br>華山1914文化創意園區位於台北市中正區，前身為台灣總督府專賣局台北酒工場，其歷史可追溯至日治時期大正3年（西元1914年），由日人創辦的『芳釀社』釀酒工場。該園區不僅是台灣現代化製酒產業的重要見證，更在1999年後，透過老建築再利用，蛻變為台灣文化創意產業的旗艦基地，成為藝文展演、餐飲休憩與文創商品的匯聚之地。",
                        "<br><br>歷史沿革\n華山園區的歷史橫跨百年，大致可分為以下階段：",
                        "<br>造酒製腦時期（1914-1987）：園區最早於1914年由民營的『芳釀社』創辦，主要生產清酒。1922年因日本政府實施專賣制度而被收購，改稱為『台灣總督府專賣局台北酒工場』，主要製造米酒及再製酒。園區內還曾設有『日本樟腦株式會社台北支店』，從事精製樟腦的生產。在專賣局接收後，現今園區內大部分的廠房建築，皆是在1931年至1933年間『新工場建設時期』所興建。1987年，因酒廠遷至桃園龜山，華山園區的製酒產業歷史正式劃下句點。",
                        "<br>空間蛻變與藝文特區時期（1987-2003）：酒廠遷出後，園區一度閒置。1999年，台灣藝術界積極爭取將其轉型為藝術中心，後由『中華民國藝術文化環境改造協會』接手經營，正式進入『華山藝文特區』時期，提供藝文界作為展演場地。",
                        "<br>文創園區時期（2003至今）：為推動文化創意產業發展，行政院於2002年規劃運用舊酒廠閒置空間，並將華山藝文特區轉型為『創意文化園區』，旨在展現文創成果、培育未來人才及提供文創資訊，成為台灣文化創意產業的重要指標。",
                        "<br><br>老建築再利用與當下使用\n華山1914文創園區成功地將這些承載歷史記憶的老建築注入了新的生命，遵循『以舊領新』、『新舊共榮』的整建原則，使其成為多元文化活動的場域：",
                        "<br>製酒廠房：園區內完整保存了日治時期的製酒產業建築群，如高塔區、烏梅劇院（原貯酒庫）、四連棟（原紅酒貯藏庫）等，這些建築展現了1930年代台灣工業建築的技術水平。斑駁的牆面、鑄鐵欄杆、挑高的空間感，如今已轉化為各具特色的展演空間、藝廊、文創商店和主題餐廳。",
                        "<br>煙囪：園區內高聳的煙囪是三大市定古蹟之一，曾是台北的地標，見證了酒廠的輝煌歲月，如今依然矗立，訴說著歷史的故事。",
                        "<br>其他附屬建築：許多小型建築和空間也經過巧思活化，進駐了設計工坊、咖啡廳、電影館（如光點華山電影館，原為再製酒包裝室）等，讓老建築與當代創意完美融合。",
                        "<br>戶外空間：廣闊的戶外綠地和紅磚步道，成為市民休憩散步、舉辦創意市集、戶外表演的熱門場所。園區旁的華山大草原更是假日野餐、遛小孩的絕佳去處。",
                        "<br><br>華山1914文化創意園區不僅是台北市的熱門景點，更是一個活生生的歷史博物館，透過對老建築的再利用，它持續展現著新活力，讓歷史與創意在此交會，為人們提供豐富的藝文體驗。"
                    ].join('\n\n');
                    this.infoModalButtonText = '進入導覽';
                    this.modalAction = 'enterExhibitionA';
                    this.showModalButton = false;
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/02-01.png',
                        './img/old-buildings/02-02.jpg'

                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框03':
                    displayContent = [
                        "<br>駁二藝術特區位於高雄市鹽埕區，前身為高雄港的老舊港口倉庫。這些倉庫建於1973年，原本是儲存貨物的普通港口倉庫。隨著高雄港產業轉型，貨運模式改變，這些倉庫逐漸閒置。",
                        "<br>歷史與老建築再利用\n2000年，為配合國慶煙火首次在高雄施放，政府人員偶然發現了這片閒置的駁二倉庫。一群熱心藝文界人士於2001年成立「駁二藝術發展協會」，積極推動將此地轉化為南部藝文發展基地。在文化部閒置空間再利用政策的協助下，駁二藝術特區於2002年正式開放，並於2006年由高雄市政府文化局接手經營。",
                        "<br><br>駁二藝術特區成功將這些老舊倉庫活化，其再利用方式多元：",
                        "<br>倉庫群：原本用來裝卸貨物的港口倉庫，現在已搖身一變為各式展覽空間、文創商店、特色餐廳、設計工坊和表演場地。園區分為大勇、蓬萊、大義三大區域，每個區域都有其獨特的藝術氛圍與進駐店家。",
                        "<br>棧貳庫：這是另一個成功的再利用案例，過去用於儲存和輸運砂糖的倉庫，現已成為結合購物、展覽、餐飲的多功能複合空間，甚至引入了歷史建築倉庫旅宿的體驗。",
                        "<br>鐵道與裝置藝術：園區內保留了舊鐵道，並利用閒置空間設置了許多大型公共藝術裝置，例如「工人與漁婦」、「巨人的積木」等，這些作品與港口歷史和城市文化緊密結合，成為熱門的打卡景點。",
                        "<br>月光劇場：過去的倉庫空間被改造為音樂展演場地，定期舉辦流行及獨立樂團演唱會。",
                        "<br>電影院與數位產業：部分倉庫也引入了現代化的功能，例如「in89駁二電影院」的進駐，以及曾有索尼電腦娛樂等數位產業公司在此設立研發中心。",
                        "<br><br>當下使用\n如今的駁二藝術特區是高雄最具代表性的文化地標之一，更是台灣舊建築活化再利用的成功典範。它不僅舉辦高雄設計節、鋼雕藝術節、貨櫃藝術節等大型藝文活動，也吸引了各式文創市集、街頭藝人在此聚集。透過水岸輕軌的串聯，遊客可以便利地穿梭於各個倉庫群與哈瑪星鐵道文化園區之間，感受港都特有的藝術氛圍與城市美學。",
                        "<br>駁二藝術特區以其獨特的歷史背景和創新的再利用模式，成功地將老舊港區轉變為一個充滿活力、創意和歷史記憶的藝術聚落。"
                    ].join('\n\n');
                    this.infoModalButtonText = '參觀室內';
                    this.modalAction = 'enterDesignDept';
                    this.showModalButton = false;
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/03-01.jpg',
                        './img/old-buildings/03-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框04':
                    displayContent = [
                        "<br>林百貨，俗稱『五層樓仔』，位於台南市中西區，是台灣歷史上極具代表性的百貨公司。它於1932年12月5日開幕，不僅是全台第二間、南台灣第一間百貨公司，更因其現代化設施和獨特風格，成為日治時期台南『末廣町』（今中正路一帶，當時被稱為『台南銀座』）繁榮與摩登的象徵。",
                        "<br><br>歷史沿革\n林百貨由日本山口縣商人林方一投資興建，開幕僅五天後林方一不幸病逝，隨後由其妻子林年子繼續經營。當時的林百貨，以鋼筋混凝土興建的『折衷樣式』建築，在物資缺乏的年代堪稱豪華。它配備了南台灣第一部電梯（俗稱『流籠』）、手搖式鐵捲門、避雷針、抽水馬桶等先進設備，讓搭乘電梯成為當時台南最時髦的活動。頂樓更設有全台唯一的百貨公司內神社——『末廣社』，彰顯了當時日本商家的信仰文化。",
                        "<br>第二次世界大戰後，林百貨結束營業，建築曾被挪作製鹽總廠、派出所、空軍單位等用途，也曾長期閒置荒廢。直到1998年被公告為台南市定古蹟，才為其重獲新生埋下伏筆。",
                        "<br><br>老建築再利用與當下使用\n經過台南市政府文化局的悉心修復，林百貨於2014年6月14日以『文創百貨』的形式重新開幕。這次的活化再利用，不僅保留了老建築的原汁原味，更融入了台南在地文化與文創元素：",
                        "<br>建築本體：建築外觀維持日治時期的棕色溝面磚立面、簡潔幾何圖形與圓形窗戶。修復團隊甚至保留了二戰末期美軍掃射留下的彈孔牆面與機槍砲座，讓歷史的痕跡清晰可見。",
                        "<br>指針式電梯：曾是台南人引以為傲的『流籠』，修復後仍保留其獨特的指針式樓層顯示器，讓遊客能親身體驗昔日的時髦。雖然為安全考量載客數有所調整，但仍能透過電梯井觀察到舊時的建築結構。",
                        "<br>頂樓神社：位於六樓的末廣社遺址，其水泥基座與鳥居依然存在，是台灣現存少數店舖內部的空中神社，也是許多遊客必訪的特色。",
                        "<br>內部空間：各樓層的規劃融合了懷舊與現代。一樓多販售台南特色伴手禮；二樓則匯聚台南在地設計與文創商品；樓上設有咖啡廳、藝文空間，甚至提供旗袍試穿體驗等。整體營造出復古溫馨的氛圍，讓逛百貨彷彿一場穿越時空的歷史之旅。",
                        "<br><br>如今，林百貨已不只是一間百貨公司，它更是台南的一張文化名片，是舊建築活化再利用的成功典範。它承載著老台南人的共同記憶，也向國內外遊客展現台南豐富的歷史底蘊與獨特的文化創意，成為體驗台南慢活風格的必訪景點。"
                    ].join('\n\n');
                    this.infoModalButtonText = '進入導覽';
                    this.modalAction = 'enterHRDept';
                    this.showModalButton = false;
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/04-01.jpg',
                        './img/old-buildings/04-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框05':
                    displayContent = [
                        "<br>文化部文化資產園區位於台中市南區，前身為台灣總督府專賣局台中酒工場，創建於1916年，是日治時期台灣四大酒廠之一。這座承載百年歷史的舊酒廠，不僅是台灣製酒產業的重要見證，更在近年透過完善的老建築再利用計畫，蛻變為台灣推動文化資產保存與活化的重要基地。",
                        "<br><br>歷史沿革\n台中酒廠的歷史可追溯至日治大正5年（1916年），最初由日人創立，生產清酒、醬油及味噌。1922年，日本政府實施專賣制度後，酒廠被收歸為『台灣總督府專賣局台中酒工場』，主要生產燒酒、米酒、福祿壽酒等，並引入西方製酒技術。戰後，酒廠由台灣省專賣局接管，改名『台灣省菸酒公賣局台中酒廠』，持續營運至2002年，因台灣加入WTO、公賣局改制為台灣菸酒公司而停止生產，正式走入歷史。",
                        "<br><br>老建築再利用與當下使用\n台中酒廠的建築群涵蓋了日治時期至今的多元風格，包括製酒廠房、儲酒庫、鍋爐室、包裝工廠、辦公廳舍等，其特殊的紅磚牆、木屋架、高聳煙囪，都見證了台灣工業發展的軌跡。在文化部與各方努力下，這些深具歷史價值的建築得以活化再生：",
                        "<br>展覽空間：廣闊的舊廠房和倉庫，經過修復後轉變為多元的展覽廳，定期舉辦主題特展、藝術展覽、文創展銷會等，提供藝術家和設計師展現創意的平台。",
                        "<br>文資保存與教育：園區內設有文化資產保存研究中心，致力於文物修復、保存技術研發及人才培育。透過導覽、工作坊等方式，推廣文化資產保存的知識與理念。",
                        "<br>文創商店與餐飲：部分歷史建築被改造為文創商品店、特色餐廳、咖啡廳等，讓遊客在享受歷史氛圍的同時，也能體驗台灣的設計能量與美食文化。",
                        "<br>表演藝術空間：園區內有規劃表演場地，不定期舉辦音樂、舞蹈、戲劇等藝文活動，豐富了台中的藝文生活。",
                        "<br>戶外空間：寬闊的戶外區域則成為民眾散步、休憩、舉辦市集或戶外活動的理想場所，讓這座百年酒廠成為與市民生活緊密連結的公共空間。",
                        "<br><br>文化部文化資產園區透過對老建築的修復、活化與再利用，不僅保留了珍貴的歷史記憶，也將其轉型為兼具文化、教育、創意與觀光功能的複合式園區，成為台灣文化資產保存與創新的重要示範。"
                    ].join('\n\n');
                    this.infoModalButtonText = '了解更多';
                    this.modalAction = 'learnMore';
                    this.showModalButton = false; // 這裡設定為 false，不顯示按鈕
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/05-01.jpg',
                        './img/old-buildings/05-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框06':
                    displayContent = [
                        "<br>台中刑務所演武場，又稱道禾六藝文化館，位於台中市西區林森路，是一座興建於日治時期昭和12年（西元1937年）的歷史建築。它最初是作為台中刑務所（今台中監獄）司獄官及警察修習柔道與劍道的武道館舍，也是台中市目前僅存的日治時期武道館建築，具有重要的歷史與建築研究價值。",
                        "<br><br>歷史沿革\n這座演武場在日治時期扮演著獄政人員訓練的重要角色。戰後，它曾轉為法務部台中監獄的一部分，週邊也興建了眷村。2004年，台中市文化局將其登錄為歷史建築。然而，在2006年曾不幸遭遇火災，部分木造建築被焚毀。經過多年的修復工程，主體及附屬建築於2010年修復完成。",
                        "2012年3月，台中市政府委託財團法人道禾教育基金會經營管理，並將其定名為『道禾六藝文化館』，於隔年5月正式開館啟用。道禾教育基金會以推廣『新六藝文化』為目標，將儒家傳統六藝（禮、樂、射、御、書、數）重新詮釋，並融入現代生活。",
                        "<br>值得注意的是，自2023年11月1日起，道禾六藝文化館已終止營運，台中市政府已將此歷史建築整區點交給文化部，納入國家漫畫博物館園區，並啟動全區整體規劃整建工程。因此，目前園區的開放時程及活動詳情，建議至文化部國家漫畫博物館台中籌備處臉書或致電館方確認。",
                        "<br><br>建築特色與再利用\n台中刑務所演武場的建築風格屬於日治時期典型的演武場形式，其特色包括：",
                        "<br>主體建築（惟和館）：採和洋折衷的磚造日式建築，屋頂為『入母屋造』（歇山式屋頂），並有大型鬼瓦及博風板裝飾，基座抬高，顯得莊嚴氣派。過去是柔道、劍道的練習空間。",
                        "<br>心行館（附屬建築）：位於主館左側，為傳統日式木構建築，過去是休憩區，現曾作為茶道、古琴、圍棋等文化推廣課程空間，並附設『小書房』。",
                        "<br>傳習館（附屬建築）：位於主館後方，原為宿舍，現曾作為弓道、書法、紙藝推廣課程及藝文展覽空間。",
                        "<br>大樹下劇場：園區內有一棵百年老榕樹，曾歷經火災卻奇蹟般地存活下來，象徵著文化的傳承與生命力。樹下設有戶外舞台，過去不定期舉辦藝文表演和市集活動。",
                        "<br><br>在道禾六藝文化館營運期間，園區透過舉辦茶道、弓道、劍道、書法、圍棋等課程與體驗活動，以及各式藝文展覽和主題市集，成功地將這座歷史建築轉化為一個結合傳統文化、藝術與教育的多元空間，也成為台中市區獨具日式風情、被譽為『台中小京都』的熱門景點。",
                        "<br>儘管經營單位已轉換，但台中刑務所演武場作為歷史建築的價值與其獨特的日式氛圍依然存在，未來將以國家漫畫博物館園區的一部分繼續承載新的文化使命。"
                    ].join('\n\n');
                    this.infoModalButtonText = '了解更多';
                    this.modalAction = 'learnMore';
                    this.showModalButton = false; // 這裡設定為 false，不顯示按鈕
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/06-01.jpg',
                        './img/old-buildings/06-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框07':
                    displayContent = [
                        "<br>四四南村位於臺北市信義區，緊鄰台北101，是臺北地區的第一個眷村，也是國共內戰時期的產物。它承載著特殊的歷史意義，見證了臺灣眷村文化的發展與變遷，如今已轉型為結合歷史、文化、創意與休閒的熱門景點。",
                        "<br><br>歷史沿革\n四四南村的名稱源自於聯勤第四十四兵工廠。1948年，國共內戰告急，大陸青島的聯勤四十四兵工廠員工及眷屬匆匆遷臺，被安置在日治時期日軍陸軍庫房的聯勤第四十四兵工廠南側，因此得名『四四南村』。起初，眷戶們抱持著『暫住』的心態，居住環境簡陋，多以木材、竹籬、石灰及瓦片搭建而成，並採連棟式的平房，以『魚骨狀』的架構排列。",
                        "<br>隨著時間推移，這些『暫住』的居民在此地生根，一待就是數十年。然而，隨著信義計畫區的土地開發及眷村改建政策的推動，四四南村的住戶於1999年全部遷出，面臨拆除的命運。在社區居民和文化界人士的努力下，發起了眷村文化保存運動，最終於2001年拍板定案，決定保留部分具代表性的建築。2003年10月25日，四四南村以信義公民會館暨眷村文化公園的新風貌重新對外開放。",
                        "<br><br>建築特色與再利用\n四四南村保留了四棟相連的眷村房舍，並將其活化再利用，賦予不同的功能：",
                        "<br>A館－信義親子館：提供親子互動的溫馨遊戲空間，融入眷村的復古氛圍，讓親子在創意中共同成長。",
                        "<br>B館－眷村文物展示館：透過靜態展示，呈現四四南村的歷史軌跡、眷村藝文、眷村媽媽的生活、眷村美食、手工藝等，讓參觀者深入了解眷村文化。",
                        "<br>C館－好丘文創餐飲生活空間：由『好，丘』進駐，提供以臺灣本土物產製作的創意貝果餐點、輕食、咖啡飲料等，並結合文創選物店，為園區增添了香氣與生活溫度。",
                        "<br>D館－南村劇場·青鳥·有·設計：融合了劇場、閱讀、設計、餐飲等多種創意能量。白天是擁有上千本主題藏書和設計商品的有機書店，夜晚則轉變為推廣臺灣新劇團、新文本、新製作的新秀劇場。",
                        "<br><br>此外，園區內還保留了防空洞和碉堡，作為歷史的見證。四四南村的戶外廣場也經常舉辦文創市集（如簡單市集、二手市集等），吸引許多遊客前來尋寶、感受悠閒的假日氛圍，也成為許多人像外拍、婚紗攝影的熱門地點。",
                        "<br>四四南村以其低矮的眷村建築，與周圍高聳的台北101等現代化商業大樓形成強烈對比，展現了信義區過去與現在的時空交錯，也成為臺北城市發展中一個獨特的文化地標。"
                    ].join('\n\n');
                    this.infoModalButtonText = '了解更多';
                    this.modalAction = 'learnMore';
                    this.showModalButton = false; // 這裡設定為 false，不顯示按鈕
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/07-01.jpeg',
                        './img/old-buildings/07-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '畫框08':
                    displayContent = [
                        "<br>嘉義檜意森活村位於嘉義市東區，是台灣第一個以森林為主題的文創園區。其前身為日治時期阿里山林業開發所建立的官方宿舍群，俗稱『檜町』。這些建築主要以阿里山檜木為建材，歷經百年歲月，見證了嘉義身為『木都』及台灣林業發展的輝煌歷史。",
                        "<br><br>歷史沿革\n檜意森活村的歷史始於日治大正年間（約1914年），隨著阿里山林業的蓬勃發展，日本人在此興建了大量官舍，作為林業相關人員的宿舍，因此整個區域充滿了檜木香氣，得名『檜町』。這個區域擁有從高級主管的『一戶建』（獨棟住宅）到基層職員的連棟宿舍，以及招待官員的『營林俱樂部』等多樣化的建築形式。",
                        "<br>國民政府來台後，這些宿舍由林務機關接管繼續使用。然而，隨著林業政策的改變，天然林木停止採伐，部分建築逐漸閒置。2005年，嘉義市政府意識到這些日式建築群的歷史價值，將其登錄為市定古蹟及歷史建築。此後，透過『檜意森活村計畫』，遵循『原材料、原工法』的原則，對園區內多達29棟的木構造歷史建築進行了長達四年的修復與整建，使其風華再現。",
                        "<br><br>老建築再利用與當下使用\n檜意森活村的活化再利用是台灣舊建築保存與文創結合的成功典範。這些承載歷史記憶的日式木造建築，如今被賦予了新的生命：",
                        "<br>日式宿舍群：大部分被修復的木造宿舍，轉型為各式文創商店、特色藝品店、伴手禮店、輕食咖啡館等。遊客可以在古色古香的日式房舍中，體驗手作DIY、品嚐嘉義特色小吃，或選購充滿地方風情的文創商品。",
                        "<br>營林俱樂部：這棟具有都鐸式半木構造風格的市定古蹟，曾是招待官員的場所，後也曾作為幼稚園使用，現則透過不同的藝文展覽，展現其過往的風華。",
                        "<br>一心二葉館（農業精品館）：位於園區北邊的新建建築，特色是利用回收舊木料整建而成的綠建築，與全台多間農會合作，展售雲嘉南地區在地農產精品和特色伴手禮。",
                        "<br>阿里山林業史館：專門展示嘉義市百年林業歷史及文物，透過圖文和實物，傳承阿里山林業的文化記憶。",
                        "<br>其他特色體驗：園區內還有提供和服租借服務，讓遊客能穿上和服在日式建築群中拍照留念，彷彿置身日本京都。此外，亦有炭雕藝術博物館、主題館等，提供多元的文化體驗。",
                        "<br>戶外景觀區：園區內有景觀水池、日式庭園，以及保留的舊鐵道等，不僅是拍照美景，也是市民休憩散步的好去處。",
                        "<br><br>檜意森活村不僅是嘉義市重要的觀光景點，更是將林業文化資產轉化為兼具歷史教育、文化創意與休閒娛樂功能的複合式園區，讓遊客在充滿檜木香氣的日式氛圍中，感受嘉義獨特的城市魅力。"
                    ].join('\n\n');
                    this.infoModalButtonText = '了解更多';
                    this.modalAction = 'learnMore';
                    this.showModalButton = false; // 這裡設定為 false，不顯示按鈕
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/08-01.jpg',
                        './img/old-buildings/08-02.jpg'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '桌子':
                    displayContent = [
                        '<br>臺北機廠鐵道博物館位於臺北市信義區，前身是臺灣鐵路管理局臺北機廠，俗稱「火車醫院」。這座具有近百年歷史的工廠，曾是臺灣鐵道車輛的製造、維修與保養基地，更是臺灣工業現代化的重要見證。目前，它正積極轉型為國家級的臺北機廠鐵道博物館，預計將成為亞洲重要的鐵道文化中心。',
                        '<br><br>歷史沿革\n臺北機廠的歷史可追溯至日治時期。為配合臺灣總督府推動的鐵道擴建計畫，原設於臺北車站附近的臺北工場不敷使用，因此選定現址於1930年動工興建，並於1935年正式啟用。當時的臺北機廠是亞洲最大的鐵路修理工廠之一，從蒸汽火車到柴油、電力機車，幾乎所有鐵路車輛的維修、組裝乃至部分製造都在此進行，是臺灣鐵道工業的心臟。',
                        '<br>戰後，臺北機廠由臺灣鐵路管理局接管，繼續承擔鐵路車輛維修重任。然而，隨著時代變遷，臺北機廠的產能與土地利用逐漸面臨轉型。2012年，臺北機廠正式遷往桃園富岡，舊廠區面臨閒置與開發的危機。在各界奔走下，文化部於2015年將臺北機廠全區指定為國定古蹟，確立了其保存與轉型的方向，並規劃將其改造為國家級鐵道博物館。',
                        '<br><br>老建築再利用與博物館籌備\n臺北機廠佔地廣闊，擁有豐富的歷史建築群和機具設備，這些都是未來博物館的核心展示內容。目前園區仍在籌備與修復中，但已可預見其活化再利用的潛力：',
                        '<br>修復工場：這是臺北機廠的核心，巨大的鋼骨結構廠房，過去是火車解體、組裝、修理的心臟地帶。未來將成為主要展示區，呈現火車維修的工藝與歷史，甚至可能開放部分車輛進行動態展示。其獨特的「天車」（吊車）軌道也是重要特色。',
                        '<br>組立工場：負責火車車體組裝的空間，其高聳的廠房將提供展示大型火車頭和車廂的理想場所。',
                        '<br>鍛冶工場：過去處理金屬鍛造的場所，保有獨特的工業氛圍，未來有望展示傳統金屬工藝和蒸汽火車的動力系統。',
                        '<br>總辦公室：採日式辦公建築風格，將作為博物館的行政與研究中心，也可能部分開放展示機廠的行政運作歷史。',
                        '<br>大澡堂：這座羅馬式浴場風格的澡堂是當年員工下班後休憩的重要場所，其獨特的拱形屋頂和採光設計，未來有望成為特色展覽空間或休憩區。',
                        '<br>員工宿舍區：這些不同等級的日式宿舍，將呈現鐵道員工的生活樣貌，也可能改造成文創商店、餐飲或特展空間。',
                        '<br>廠區鐵道與機具：園區內縱橫交錯的鐵道、扇形車庫以及各種大型機具，本身就是重要的展品，將透過動線規劃，讓參觀者沉浸式體驗鐵道工業的氛圍。',
                        '<br><br>臺北機廠鐵道博物館的願景是打造一個融合歷史文化、產業技術、教育研究與休閒觀光的國家級博物館，不僅保存了臺灣的鐵道記憶，也將成為推動鐵道文化與工業遺產保存的重要基地。'
                    ].join('\n\n');
                    this.infoModalButtonText = '了解更多';
                    this.modalAction = 'learnMore';
                    this.showModalButton = false; // 這裡設定為 false，不顯示按鈕
                    this.showImageCarousel = true;
                    this.carouselImages = [
                        './img/old-buildings/09-01.jpg',
                        './img/old-buildings/09-02.png'
                    ];
                    this.currentImageIndex = 0;
                    break;
                case '大門':
                    displayContent = '';
                    this.infoModalButtonText = '離開';
                    this.modalAction = 'exit';
                    this.showModalButton = true;
                    break;
                default:
                    displayContent = '沒有找到該物件的介紹資訊。';
                    this.infoModalButtonText = '關閉';
                    this.modalAction = 'close';
                    this.showModalButton = true;
            }
            this.infoModalTitle = displayTitle;   // 設定彈出視窗標題
            this.infoModalContent = displayContent;  // 資訊彈出視窗的內容
            this.showInfoModal = true;
        },
        enterExhibition() {
            this.closeInfoModal(); // 先關閉彈出視窗
            switch (this.modalAction) {
                case 'enterExhibitionA':
                    window.location.href = 'loading.html?target=taiwan-history.html';
                    break;
                case 'exit':
                    window.location.href = 'topic.html';
                    break;
                case 'viewArtwork':
                    // 這裡可以添加跳轉到畫作詳細頁面或執行其他操作的邏輯
                    console.log('查看更多畫作');
                    break;
                case 'enterDesignDept':
                    window.location.href = 'loading.html?target=old-buildings.html';
                    break;
                case 'enterHRDept':
                    window.location.href = 'loading.html?target=ammunition-depot-history.html';
                    break;
                case 'learnMore':
                    console.log('了解更多');
                    break;
                case 'close':
                default:
                    // 預設行為，例如只關閉彈出視窗
                    break;
            }
        },
        // *** 修改結束：showFrameInfo 方法 ***

        // 新增：滑鼠點擊事件，用於切換攝影機和偵測物件點擊
        onMouseClick(event) {
            // 確保應用程式已初始化，避免在載入時觸發
            if (!this.isInitialized || isTransitioning) return; // ✅ 防止初始化前與動畫中點擊
            if (!loadedModel || !raycaster || !mouse || !currentCamera) return;

            event.preventDefault();

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, currentCamera);

            // *** 關鍵修正：偵測整個模型，而不只是導覽點 ***
            const intersects = raycaster.intersectObjects([loadedModel], true);

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object; // 這是實際被點擊的 Three.js 物件
                console.log('Clicked object:', clickedObject);
                console.log('Clicked object userData:', clickedObject.userData);

                // clickableFramesAndDoor 和 frameNames 現在是全域變數
                const clickableObjects = ["畫框01", "畫框02", "畫框03", "畫框04", "畫框05", "畫框06", "畫框07", "畫框08", "桌子", "大門"];
                let targetNavPointName = null;
                let clickedItemName = null;

                // --- 遍歷父物件，同時檢查導覽點和可點擊物件 ---
                let parent = clickedObject;
                while (parent) {
                    // 檢查是否為導覽點 (使用全域變數 targetObjectNames)
                    if (!targetNavPointName && targetObjectNames.includes(parent.name)) {
                        targetNavPointName = parent.name;
                    }
                    // 檢查是否為可點擊的物件 (畫框、門或桌子)
                    if (!clickedItemName && clickableObjects.includes(parent.name)) {
                        clickedItemName = parent.name;
                    }
                    // 如果兩種類型都找到了，就可以提前結束循環
                    if (targetNavPointName && clickedItemName) {
                        break;
                    }
                    parent = parent.parent;
                }

                // 如果找到了可點擊的物件，就顯示資訊彈出視窗
                if (clickedItemName) {
                    // *** 修改：傳遞 clickedObject ***
                    this.showFrameInfo(clickedItemName, clickedObject);

                    // 如果點擊的是「介紹欄1」，則切換攝影機並將視角向後看
                    if (clickedItemName === '畫框01') {
                        // 直接使用全域的 cameraNav7
                        const targetCamera = cameraNav3;

                        if (targetCamera) {
                            console.log('Clicked "畫框01". Target Camera (NavCamera3) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera3 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera3，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框01', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera3Config = navCameras["我是標示點3"];
                            if (navCamera3Config) {
                                currentCamera.rotation.set(navCamera3Config.initialRotationX, navCamera3Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera3Config.initialRotationX;
                                firstPersonRotationY = navCamera3Config.initialRotationY;
                                console.log('NavCamera3 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera3 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav3。');
                        }
                    } else if (clickedItemName === '畫框02') {

                        const targetCamera = cameraNav4;

                        if (targetCamera) {
                            console.log('Clicked "畫框02". Target Camera (NavCamera4) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera8 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera4，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框02', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera4Config = navCameras["我是標示點4"];
                            if (navCamera4Config) {
                                currentCamera.rotation.set(navCamera4Config.initialRotationX, navCamera4Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera4Config.initialRotationX;
                                firstPersonRotationY = navCamera4Config.initialRotationY;
                                console.log('NavCamera4 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera4 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav4。');
                        }
                    } else if (clickedItemName === '畫框03') {
                        // 直接使用全域的 cameraNav9
                        const targetCamera = cameraNav5;

                        if (targetCamera) {
                            console.log('Clicked "畫框03". Target Camera (NavCamera5) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera9 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera5，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框03', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera5Config = navCameras["我是標示點5"];
                            if (navCamera5Config) {
                                currentCamera.rotation.set(navCamera5Config.initialRotationX, navCamera5Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera5Config.initialRotationX;
                                firstPersonRotationY = navCamera5Config.initialRotationY;
                                console.log('NavCamera5 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera5 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav5。');
                        }
                    } else if (clickedItemName === '畫框04') {
                        // 直接使用全域的 cameraNav10
                        const targetCamera = cameraNav6;

                        if (targetCamera) {
                            console.log('Clicked "畫框04". Target Camera (NavCamera6) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera10 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera6，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框04', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera6Config = navCameras["我是標示點6"];
                            if (navCamera6Config) {
                                currentCamera.rotation.set(navCamera6Config.initialRotationX, navCamera6Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera6Config.initialRotationX;
                                firstPersonRotationY = navCamera6Config.initialRotationY;
                                console.log('NavCamera6 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera6 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav6。');
                        }
                    } else if (clickedItemName === '畫框05') {
                        // 直接使用全域的 cameraNav8
                        const targetCamera = cameraNav7;

                        if (targetCamera) {
                            console.log('Clicked "畫框05". Target Camera (NavCamera7) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera8 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera7，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框05', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera7Config = navCameras["我是標示點7"];
                            if (navCamera7Config) {
                                currentCamera.rotation.set(navCamera7Config.initialRotationX, navCamera7Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera7Config.initialRotationX;
                                firstPersonRotationY = navCamera7Config.initialRotationY;
                                console.log('NavCamera7 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera7 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav7。');
                        }
                    } else if (clickedItemName === '畫框06') {
                        // 直接使用全域的 cameraNav8
                        const targetCamera = cameraNav8;

                        if (targetCamera) {
                            console.log('Clicked "畫框06". Target Camera (NavCamera8) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera8 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera8，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框06', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera8Config = navCameras["我是標示點8"];
                            if (navCamera8Config) {
                                currentCamera.rotation.set(navCamera8Config.initialRotationX, navCamera8Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera8Config.initialRotationX;
                                firstPersonRotationY = navCamera8Config.initialRotationY;
                                console.log('NavCamera8 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera8 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav8。');
                        }
                    } else if (clickedItemName === '畫框07') {
                        // 直接使用全域的 cameraNav8
                        const targetCamera = cameraNav9;

                        if (targetCamera) {
                            console.log('Clicked "畫框07". Target Camera (NavCamera9) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera9 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera9，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框07', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera9Config = navCameras["我是標示點9"];
                            if (navCamera9Config) {
                                currentCamera.rotation.set(navCamera9Config.initialRotationX, navCamera9Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera9Config.initialRotationX;
                                firstPersonRotationY = navCamera9Config.initialRotationY;
                                console.log('NavCamera9 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera9 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav9。');
                        }
                    } else if (clickedItemName === '畫框08') {
                        // 直接使用全域的 cameraNav8
                        const targetCamera = cameraNav10;

                        if (targetCamera) {
                            console.log('Clicked "畫框08". Target Camera (NavCamera10) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera8 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera10，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('畫框08', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera10Config = navCameras["我是標示點10"];
                            if (navCamera10Config) {
                                currentCamera.rotation.set(navCamera10Config.initialRotationX, navCamera10Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera10Config.initialRotationX;
                                firstPersonRotationY = navCamera10Config.initialRotationY;
                                console.log('NavCamera10 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera10 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav10。');
                        }
                    } else if (clickedItemName === '桌子') {
                        // 直接使用全域的 cameraNav8
                        const targetCamera = cameraNav11;

                        if (targetCamera) {
                            console.log('Clicked "桌子". Target Camera (NavCamera11) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera8 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera11，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('桌子', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera11Config = navCameras["我是標示點11"];
                            if (navCamera11Config) {
                                currentCamera.rotation.set(navCamera11Config.initialRotationX, navCamera11Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera11Config.initialRotationX;
                                firstPersonRotationY = navCamera11Config.initialRotationY;
                                console.log('NavCamera11 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera11 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNavra11。');
                        }

                    } else if (clickedItemName === '大門') {
                        // 直接使用全域的 cameraNav11
                        const targetCamera = cameraNav12;

                        if (targetCamera) {
                            console.log('Clicked "大門". Target Camera (NavCamera12) position:', targetCamera.position);
                            console.log('Current Camera position BEFORE switch:', currentCamera.position);
                            console.log('Current Camera rotation BEFORE switch:', currentCamera.rotation);

                            // 立即切換 currentCamera
                            currentCamera = targetCamera;

                            // 禁用 OrbitControls
                            controls.enabled = false;
                            isFirstPersonMode = true; // 設定為第一人稱模式

                            // 使用 GSAP 動畫平滑移動攝影機到 NavCamera11 的位置
                            isTransitioning = true;
                            gsap.to(currentCamera.position, {
                                duration: 1.5,
                                x: targetCamera.position.x,
                                y: targetCamera.position.y,
                                z: targetCamera.position.z,
                                ease: "power2.inOut",
                                onComplete: function () {
                                    if (!isTransitioning) return;
                                    console.log('GSAP position animation complete. Current Camera position AFTER animation:', currentCamera.position);
                                    console.log('攝影機已切換到 NavCamera12，並進入第一人稱模式。');
                                    // 在第一人稱模式下，OrbitControls 應保持禁用
                                    // 並且不需要設定 controls.object 或 controls.target
                                    // 視角控制將由 handleMouseMove 處理
                                    // *** 修改：傳遞 clickedObject ***
                                    this.showFrameInfo('大門', clickedObject); // 在動畫完成後顯示資訊彈出視窗
                                    isTransitioning = false;
                                }.bind(this) // 綁定 this，確保在 onComplete 中可以訪問 Vue 實例的 this
                            });

                            // 移除旋轉動畫，讓攝影機保持其預設的初始旋轉
                            // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                            // 並且將當前攝影機的旋轉設定為這個初始旋轉
                            // 這樣滑鼠拖曳可以從這個點開始
                            const navCamera12Config = navCameras["我是標示點12"];
                            if (navCamera12Config) {
                                currentCamera.rotation.set(navCamera12Config.initialRotationX, navCamera12Config.initialRotationY, 0, 'YXZ');
                                firstPersonRotationX = navCamera12Config.initialRotationX;
                                firstPersonRotationY = navCamera12Config.initialRotationY;
                                console.log('NavCamera12 initial rotation applied: X=', firstPersonRotationX, 'Y=', firstPersonRotationY);
                            } else {
                                console.warn('NavCamera12 config not found in navCameras.');
                            }

                        } else {
                            console.warn('無法找到 cameraNav12。');
                        }
                    }
                }

                // 如果點擊的是導覽點，執行攝影機切換
                if (targetNavPointName) {
                    console.log(`Clicked on: ${targetNavPointName}`); // Debug log
                    // *** 關鍵修正：將 currentTargetCameraObj 和 targetIsFirstPersonMode 儲存為局部常數 ***
                    const currentTargetCameraObj = navCameras[targetNavPointName]; // navCameras 現在是全域變數
                    if (currentTargetCameraObj && currentTargetCameraObj.camera) {
                        const targetCamera = currentTargetCameraObj.camera;
                        const targetIsFirstPersonMode = currentTargetCameraObj.isFirstPerson; // 儲存目標模式

                        // *** 修正：在動畫開始前就切換 currentCamera ***
                        currentCamera = targetCamera;

                        console.log(`點擊了 "${targetNavPointName}"，準備切換到攝影機 "${currentCamera.name}"`);
                        console.log('Current isFirstPersonMode:', isFirstPersonMode); // Debug log
                        console.log('Controls enabled before disable:', controls.enabled); // Debug log

                        // 禁用 OrbitControls
                        controls.enabled = false;
                        console.log('Controls enabled after disable:', controls.enabled);

                        // 判斷是否為第一人稱模式 (這個是全域變數，會在動畫開始時設定)
                        isFirstPersonMode = targetIsFirstPersonMode; // 現在直接使用儲存的目標模式
                        console.log('New isFirstPersonMode:', isFirstPersonMode);

                        // 1. 先讀取目標攝影機預先宣告好的座標
                        const destinationPosition = targetCamera.position.clone(); // 使用 .clone() 確保我們得到一個獨立的向量，而不是參考

                        // 2. 再使用讀取到的座標進行移動動畫
                        gsap.to(currentCamera.position, {
                            duration: 1.5,
                            x: destinationPosition.x,
                            y: destinationPosition.y,
                            z: destinationPosition.z,
                            ease: "power2.inOut",
                            onUpdate: function () {
                                // 在動畫過程中，如果目標攝影機是第一人稱，保持看向初始方向；否則看向 OrbitControls 的目標
                                // 這裡使用 `targetIsFirstPersonMode` 而不是 `isFirstPersonMode`，確保動畫期間行為正確
                                if (!targetIsFirstPersonMode) {
                                    // 這裡如果 currentTargetCameraObj.initialLookAt 是 null，會導致錯誤
                                    // 所以確保這裡有個 fallback
                                    const lookAtTarget = currentTargetCameraObj.initialLookAt || new THREE.Vector3(0, 0, 0);
                                    currentCamera.lookAt(lookAtTarget);
                                } else {
                                    // 對於第一人稱動畫，讓它保持當前動畫的 rotation 即可，因為 onComplete 會設定
                                }
                            },
                            onComplete: function () {
                                if (!isTransitioning) return;
                                console.log('GSAP position animation complete.'); // Debug log
                                currentCamera = targetCamera; // 正式切換攝影機實例
                                console.log('currentCamera after switch:', currentCamera.name); // Debug log

                                // 這裡的 isFirstPersonMode 是動畫結束時的全域狀態
                                if (isFirstPersonMode) {
                                    console.log("進入第一人稱模式");
                                    // 確保第一人稱攝影機的初始旋轉與模型導覽點一致
                                    // 並且將當前攝影機的旋轉設定為這個初始旋轉
                                    // 這樣滑鼠拖曳可以從這個點開始
                                    // *** 修正：使用 currentTargetCameraObj 確保正確的 initialRotation ***
                                    currentCamera.rotation.set(currentTargetCameraObj.initialRotationX, currentTargetCameraObj.initialRotationY, 0, 'YXZ');
                                    firstPersonRotationX = currentTargetCameraObj.initialRotationX;
                                    firstPersonRotationY = currentTargetCameraObj.initialRotationY;

                                    // 啟用滑鼠拖曳控制的標誌
                                    isDragging = false; // 初始不拖曳

                                    isTransitioning = false;

                                } else {
                                    // 恢復 OrbitControls 設置，並啟用
                                    controls.object = currentCamera; // 更新 OrbitControls 所控制的攝影機
                                    // *** 修正：使用 currentTargetCameraObj 確保正確的 initialLookAt ***
                                    controls.target.copy(currentTargetCameraObj.initialLookAt || new THREE.Vector3(0, 0, 0)); // 設定為導覽攝影機的初始目標點，實現軌道旋轉
                                    controls.enableZoom = true;
                                    controls.enablePan = true;
                                    controls.minPolarAngle = 0; // 解除垂直旋轉限制
                                    controls.maxPolarAngle = Math.PI; // 解除垂直旋轉限制
                                    controls.enabled = true; // 啟用 OrbitControls
                                    controls.update(); // 強制更新 controls
                                    console.log('OrbitControls re-enabled for non-first-person mode.'); // Debug log
                                }
                                console.log('Controls enabled at end of position animation:', controls.enabled); // Debug log
                            }
                        });

                        // 使用 GSAP 動畫平滑旋轉攝影機 (對於第一人稱，是旋轉到初始朝向)
                        // *** 修正：確保目標是第一人稱的初始旋轉，而不是 targetCamera 的 rotation ***
                        const targetRotationX = targetIsFirstPersonMode ? currentTargetCameraObj.initialRotationX : targetCamera.rotation.x;
                        const targetRotationY = targetIsFirstPersonMode ? currentTargetCameraObj.initialRotationY : targetCamera.rotation.y;
                        const targetRotationZ = targetIsFirstPersonMode ? 0 : targetCamera.rotation.z; // 第一人稱通常 Z 軸為 0，避免 roll

                        gsap.to(currentCamera.rotation, {
                            duration: 1.5,
                            x: targetRotationX,
                            y: targetRotationY,
                            z: targetRotationZ,
                            ease: "power2.inOut",
                            onComplete: function () {
                                if (!isTransitioning) return;
                                console.log('GSAP rotation animation complete.'); // Debug log
                                isTransitioning = false;
                            }
                        });
                    }
                }
            }
        },
    },
    mounted() {
        // 0. 基本設定
        const container = document.getElementById('three-container');
        if (!container) {
            console.error('無法找到 ID 為 "three-container" 的容器。');
            return;
        }

        // 導覽攝影機的設定 (保持不變)
        cameraNav1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav1.name = "NavCamera1";
        cameraNav1.position.set(3.13, -0.45, -0.21);

        cameraNav2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav2.name = "NavCamera2";
        cameraNav2.position.set(-2.49, -0.45, -0.21);

        cameraNav3 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav3.name = "NavCamera3";
        cameraNav3.position.set(3.38, -0.45, -0.21);

        cameraNav4 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav4.name = "NavCamera4";
        cameraNav4.position.set(1.50, -0.45, -0.21);

        cameraNav5 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav5.name = "NavCamera5";
        cameraNav5.position.set(-1.9, -0.45, -0.21);

        cameraNav6 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav6.name = "NavCamera6";
        cameraNav6.position.set(-2.8, -0.45, -0.21);


        cameraNav7 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav7.name = "NavCamera7";
        cameraNav7.position.set(3.13, -0.45, -0.21);
        cameraNav7.rotation.y = Math.PI; // 將攝影機繞 Y 軸旋轉 180 度 (π 弧度)

        cameraNav8 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav8.name = "NavCamera8";
        cameraNav8.position.set(-2.49, -0.45, -0.21); // 調整位置


        cameraNav9 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav9.name = "NavCamera9";
        cameraNav9.position.set(-2.49, -0.45, -0.21);
        cameraNav9.rotation.y = Math.PI;

        cameraNav10 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav10.name = "NavCamera10";
        cameraNav10.position.set(-1.1, -0.45, -0.21);
        cameraNav10.rotation.y = -Math.PI / 2;

        cameraNav11 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav11.name = "NavCamera11";
        cameraNav11.position.set(-2.49, -0.45, -0.21);

        cameraNav12 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraNav12.name = "NavCamera12";
        cameraNav12.position.set(3.13, -0.45, -0.21);



        // 導覽點與攝影機的對應關係 (保持不變)
        navCameras = {
            "我是標示點1": { camera: cameraNav1, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI / 2 },
            "我是標示點2": { camera: cameraNav2, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: 0 },
            "我是標示點3": { camera: cameraNav3, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI },
            "我是標示點4": { camera: cameraNav4, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI },
            "我是標示點5": { camera: cameraNav5, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI },
            "我是標示點6": { camera: cameraNav6, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI },
            "我是標示點7": { camera: cameraNav7, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: -Math.PI / 2 }, // 对应介紹欄1
            "我是標示點8": { camera: cameraNav8, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI / 2 }, // 对应介紹欄2
            "我是標示點9": { camera: cameraNav9, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: 0 },  // 对应介紹欄3
            "我是標示點10": { camera: cameraNav10, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: 0 }, // 对应介紹
            "我是標示點11": { camera: cameraNav11, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: Math.PI / 2 }, // 对应出口
            "我是標示點12": { camera: cameraNav12, isFirstPerson: true, initialLookAt: null, initialRotationX: 0, initialRotationY: 0 }
        };

        // 1. 初始化場景、攝影機和渲染器 (賦值給全域變數)
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);

        defaultCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        defaultCamera.position.set(0, 0, 5);
        currentCamera = defaultCamera;

        renderer = new THREE.WebGLRenderer({
            alpha: true,       // ✅ 啟用透明背景
            antialias: true    // ✅ 抗鋸齒讓邊緣更平滑
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);  // ✅ 完全透明背景
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        // ✅ 自訂第一人稱視角旋轉控制器（滑鼠 + 觸控）
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        // const sensitivity = 0.002;
        const mouseSensitivity = 0.005;
        const touchSensitivity = 0.002;
        const maxVerticalAngle = Math.PI / 2.5;

        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        function onMouseDown(e) {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }

        function onMouseMove(e) {
            if (!isDragging) return;

            const deltaX = (e.clientX - previousMousePosition.x) * mouseSensitivity;
            const deltaY = (e.clientY - previousMousePosition.y) * mouseSensitivity;

            currentCamera.rotation.y -= deltaX;
            currentCamera.rotation.x -= deltaY;
            currentCamera.rotation.x = clamp(currentCamera.rotation.x, -maxVerticalAngle, maxVerticalAngle);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }


        function onMouseUp() {
            isDragging = false;
        }

        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);

        // ✅ 手機觸控事件
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            isDragging = true;
            previousMouseX = e.touches[0].clientX;
            previousMouseY = e.touches[0].clientY;
        }, { passive: true });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - previousMouseX;
            const deltaY = currentY - previousMouseY;

            // 模仿電腦版：根據主要移動方向選一個旋轉
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平旋轉
                currentCamera.rotation.y -= deltaX * touchSensitivity;
            } else {
                // 垂直旋轉
                currentCamera.rotation.x -= deltaY * touchSensitivity;
                currentCamera.rotation.x = clamp(currentCamera.rotation.x, -maxVerticalAngle, maxVerticalAngle);
            }

            previousMouseX = currentX;
            previousMouseY = currentY;
        }, { passive: true });

        renderer.domElement.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;

            currentCamera.rotation.y -= deltaX * sensitivity;
            currentCamera.rotation.x -= deltaY * sensitivity;
            currentCamera.rotation.x = clamp(currentCamera.rotation.x, -maxVerticalAngle, maxVerticalAngle);

            previousMousePosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }, { passive: true });

        renderer.domElement.addEventListener('touchend', () => {
            isDragging = false;
        });

        container.appendChild(renderer.domElement);

        // 2. 添加環境光和方向光
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 10, 7.5).normalize();
        scene.add(directionalLight);

        // 3. 初始化 OrbitControls (賦值給全域變數)
        controls = new OrbitControls(currentCamera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 50;
        controls.enableZoom = false; // 禁用縮放功能
        controls.enableRotate = true;

        // ✅ 加這段以支援手機手勢操作
        controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        // 4. 初始化變數 (賦值給全域變數)
        const loader = new GLTFLoader();
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        const modelCenter = new THREE.Vector3();
        const modelSize = new THREE.Vector3();

        // 5. 載入模型
        loader.load(
            './model/old-buildings.glb',
            (gltf) => {
                loadedModel = gltf.scene;
                scene.add(loadedModel);

                // 模型置中
                const box = new THREE.Box3().setFromObject(loadedModel);
                const modelCenter = new THREE.Vector3();
                const modelSize = new THREE.Vector3();
                box.getCenter(modelCenter);
                box.getSize(modelSize);
                loadedModel.position.sub(modelCenter);
                console.log('模型已移到世界中心。');
                // *** 新增開始：為特定物件添加自訂顯示名稱到 userData ***
                loadedModel.traverse((child) => {
                    switch (child.name) {
                        case '畫框01':
                            child.userData.customDisplayName = '松山文創園區';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框02':
                            child.userData.customDisplayName = '華山1914文化創意園區';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框03':
                            child.userData.customDisplayName = '駁二藝術特區';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框04':
                            child.userData.customDisplayName = '林百貨';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框05':
                            child.userData.customDisplayName = '文化部文化資產園區';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框06':
                            child.userData.customDisplayName = '台中刑務所演武場';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框07':
                            child.userData.customDisplayName = '四四南村';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '畫框08':
                            child.userData.customDisplayName = '嘉義檜意森活村';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '桌子':
                            child.userData.customDisplayName = '台北機廠鐵道博物館';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        case '大門':
                            child.userData.customDisplayName = '出口';
                            console.log(`Set customDisplayName for ${child.name}:`, child.userData.customDisplayName);
                            break;
                        // 如果有其他物件需要自訂名稱，可以在這裡添加
                    }

                });
                // *** 新增結束：為特定物件添加自訂顯示名稱到 userData ***

                // --- 尋找所有可高亮的物件並存儲 (填充到全域變數 highlightableObjects) ---
                highlightableObjects.length = 0; // 清空舊數據，確保每次載入都正確
                highlightableNames.forEach(name => {
                    const object = loadedModel.getObjectByName(name);
                    if (object) {
                        highlightableObjects.push(object);
                        console.log(`找到可互動物件：${name}`);
                    } else {
                        console.warn(`互動物件警告：在模型中找不到名為 "${name}" 的物件。`);
                    }
                });

                // 尋找攝影機標點以設定初始第一人稱視角
                const urlParams = new URLSearchParams(window.location.search);
                const initialCameraName = urlParams.get('camera');

                let initialCameraConfig = navCameras["我是標示點1"]; // Default to NavCamera1
                if (initialCameraName) {
                    // Find the corresponding navCamera based on the name passed from the URL
                    const foundConfig = Object.values(navCameras).find(config => config.camera.name === initialCameraName);
                    if (foundConfig) {
                        initialCameraConfig = foundConfig;
                        console.log(`從 URL 參數讀取到初始攝影機：${initialCameraName}`);
                    } else {
                        console.warn(`URL 參數指定的攝影機 "${initialCameraName}" 未找到，使用預設攝影機。`);
                    }
                }

                if (initialCameraConfig) {
                    const targetCamera = initialCameraConfig.camera;
                    currentCamera = targetCamera;
                    isFirstPersonMode = initialCameraConfig.isFirstPerson;
                    controls.enabled = !isFirstPersonMode; // Disable controls if in first-person mode

                    if (isFirstPersonMode) {
                        currentCamera.rotation.set(initialCameraConfig.initialRotationX, initialCameraConfig.initialRotationY, 0, 'YXZ');
                        firstPersonRotationX = initialCameraConfig.initialRotationX;
                        firstPersonRotationY = initialCameraConfig.initialRotationY;
                        console.log(`已設定初始視角為 "${targetCamera.name}" (第一人稱)。`);
                    } else {
                        controls.object = currentCamera;
                        controls.target.copy(initialCameraConfig.initialLookAt || new THREE.Vector3(0, 0, 0));
                        controls.enableZoom = true;
                        controls.enablePan = true;
                        controls.minPolarAngle = 0;
                        controls.maxPolarAngle = Math.PI;
                        controls.update();
                        console.log(`已設定初始視角為 "${targetCamera.name}" (第三人稱)。`);
                    }
                    console.log(`${targetCamera.name} 座標為: `, targetCamera.position);
                } else {
                    console.warn('未找到初始攝影機配置。將使用預設的第三人稱視角。');
                    updateCameraForModel();
                }

                // 確保控制器更新其內部狀態
                controls.update();

                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    this.instructionStep = 1;
                }, 500);

                // 輸出標示點的座標
                targetObjectNames.forEach(name => {
                    const marker = loadedModel.getObjectByName(name);
                    if (marker) {
                        const worldPosition = new THREE.Vector3();
                        marker.getWorldPosition(worldPosition);
                        console.log(`物件 "${name}" 的世界座標: X=${worldPosition.x.toFixed(2)}, Y=${worldPosition.y.toFixed(2)}, Z=${worldPosition.z.toFixed(2)}`);
                    } else {
                        console.warn(`警告：在模型中找不到名為 "${name}" 的標示點。`);
                    }
                });

            },
            (xhr) => {
                let percent = 0;

                if (xhr.lengthComputable && xhr.total > 0) {
                    percent = (xhr.loaded / xhr.total) * 100;
                    percent = Math.min(percent, 100); // 保護上限
                } else {
                    percent = 100; // 無法計算進度時直接設為 100%
                    console.warn('lengthComputable 無效，使用 fallback 100%');
                }

                // 更新 Vue 的進度與 UI
                this.loadingProgress = Math.round(percent);

                const percentageText = document.getElementById('progressPercentage');
                if (percentageText) {
                    percentageText.textContent = `${this.loadingProgress}%`;
                }

                console.log(`模型載入中... ${percent.toFixed(2)}%`);
            }
        );

        // 此函式僅在模型不包含攝影機時，用於設定預設攝影機的視角
        function updateCameraForModel() {
            if (!loadedModel) return;

            const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
            const fov = defaultCamera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

            cameraZ *= 1.5; // 攝影機距離模型的乘數

            defaultCamera.position.set(modelCenter.x, modelCenter.y, modelCenter.z + cameraZ);
            controls.target.copy(modelCenter);
        }

        function onWindowResize() {
            const aspect = container.clientWidth / container.clientHeight;
            renderer.setSize(container.clientWidth, container.clientHeight);

            // 更新所有已知的攝影機，並確保當前攝影機也被更新
            const camerasToUpdate = [defaultCamera, cameraNav1, cameraNav2, cameraNav3];
            if (currentCamera && !camerasToUpdate.includes(currentCamera)) {
                camerasToUpdate.push(currentCamera);
            }

            camerasToUpdate.forEach(cam => {
                if (cam) {
                    cam.aspect = aspect;
                    cam.updateProjectionMatrix();
                }
            });
        }
        window.addEventListener('resize', onWindowResize);

        // Event Handlers
        // Attach Event Listeners
        const tooltip = document.getElementById('tooltip'); // Get tooltip element
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('mouseup', handleMouseUp);
        renderer.domElement.addEventListener('click', this.onMouseClick); // Add click listener
        window.addEventListener('keydown', handleKeyDown, false);

        function handleMouseMove(event) {
            // 確保 loadedModel 已載入
            if (!loadedModel || !raycaster || !mouse || !currentCamera) return;

            // Reset all previous highlights (使用全域變數 originalEmissive)
            originalEmissive.forEach((originalColor, object) => {
                if (object.material) {
                    object.material.emissive.setHex(originalColor);
                }
            });
            originalEmissive.clear();

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, currentCamera);
            const intersects = raycaster.intersectObjects([loadedModel], true); // Intersect with the entire model

            let objectToHighlight = null;
            let tooltipText = '';

            if (intersects.length > 0) {
                const intersectedMesh = intersects[0].object; // The actual mesh hit by the raycaster

                // Traverse up the hierarchy to find the named highlightable object (使用全域變數 highlightableNames)
                let parent = intersectedMesh;
                while (parent) {
                    if (highlightableNames.includes(parent.name)) {
                        objectToHighlight = parent;
                        tooltipText = parent.userData.customDisplayName || parent.name; // 優先使用 customDisplayName，否則使用物件名稱
                        break;
                    }
                    parent = parent.parent;
                }
            }

            if (objectToHighlight) {
                // Highlight single object (whether it's a frame or not)
                objectToHighlight.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (!originalEmissive.has(child)) { // Only clone and store original if not already processed
                            originalEmissive.set(child, child.material.emissive.getHex());
                            child.material = child.material.clone(); // Always clone to ensure unique material for highlighting
                        }
                        child.material.emissive.setHex(0x00ff00); // Green highlight
                    }
                });

                // Show tooltip
                tooltip.innerHTML = tooltipText;
                tooltip.style.left = `${event.clientX - tooltip.offsetWidth - 10}px`; // Position to the left of the mouse
                tooltip.style.top = `${event.clientY + 10}px`;
                tooltip.classList.add('show');
            } else {
                // Hide tooltip if no object is hovered
                tooltip.classList.remove('show');
            }

            // First-person camera rotation logic (if isDragging and isFirstPersonMode)
            if (isFirstPersonMode && isDragging) {
                const deltaX = event.clientX - previousMouseX;
                const deltaY = event.clientY - previousMouseY;

                firstPersonRotationY -= deltaX * 0.002; // Adjust sensitivity
                firstPersonRotationX -= deltaY * 0.002; // Adjust sensitivity

                // Clamp X rotation to prevent flipping
                firstPersonRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, firstPersonRotationX));

                currentCamera.rotation.set(firstPersonRotationX, firstPersonRotationY, 0, 'YXZ');

                previousMouseX = event.clientX;
                previousMouseY = event.clientY;
            }
        }

        function handleMouseDown(event) {
            if (isFirstPersonMode) {
                isDragging = true;
                previousMouseX = event.clientX;
                previousMouseY = event.clientY;
            }
        }

        function handleMouseUp() {
            if (isFirstPersonMode) {
                isDragging = false;
            }
        }

        function handleKeyDown(event) {
            console.log('onKeyDown triggered.'); // Debug log
            if (event.key === 'Escape') {
                console.log('按下 ESC 鍵，切換回預設攝影機');
                console.log('Current isFirstPersonMode before ESC:', isFirstPersonMode); // Debug log
                console.log('Controls enabled before ESC:', controls.enabled); // Debug log

                // 停止第一人稱模式
                isFirstPersonMode = false;
                isDragging = false; // 確保拖曳狀態重置
                console.log('isFirstPersonMode after ESC reset:', isFirstPersonMode); // Debug log

                // 啟用 OrbitControls (會自動接管 currentCamera)
                if (controls) { // 檢查 controls 是否已定義
                    controls.enabled = true;
                    console.log('Controls enabled after ESC re-enable:', controls.enabled); // Debug log
                }


                // 使用 GSAP 動畫平滑移動攝影機
                gsap.to(currentCamera.position, {
                    duration: 1.5,
                    x: defaultCamera.position.x,
                    y: defaultCamera.position.y,
                    z: defaultCamera.position.z,
                    ease: "power2.inOut",
                    onUpdate: function () {
                        if (controls && controls.target) { // 確保 controls 和 controls.target 已定義
                            currentCamera.lookAt(controls.target); // 確保在動畫過程中攝影機看向目標
                        }
                    },
                    onComplete: function () {
                        if (!isTransitioning) return;
                        console.log('GSAP ESC position animation complete.'); // Debug log
                        currentCamera = defaultCamera; // 正式切換攝影機實例
                        if (controls) { // 檢查 controls 是否已定義
                            controls.object = currentCamera; // 更新 OrbitControls 所控制的攝影機
                            controls.target.set(0, 0, 0); // 預設攝影機的目標通常是原點
                            controls.enableZoom = true; // 啟用縮放
                            controls.enablePan = true; // 啟用平移
                            controls.minPolarAngle = 0; // 解除垂直旋轉限制
                            controls.maxPolarAngle = Math.PI; // 解除垂直旋轉限制
                            controls.update(); // 強制更新 controls
                            console.log('Controls enabled at end of ESC animation:', controls.enabled); // Debug log
                            isTransitioning = false;
                        }
                    }
                });

                // 使用 GSAP 動畫平滑旋轉攝影機
                // 這裡的目標是 defaultCamera 的初始旋轉 (通常是 0,0,0)
                gsap.to(currentCamera.rotation, {
                    duration: 1.5,
                    x: defaultCamera.rotation.x,
                    y: defaultCamera.rotation.y,
                    z: defaultCamera.rotation.z,
                    ease: "power2.inOut",
                    onComplete: function () {
                        if (!isTransitioning) return;
                        console.log('GSAP rotation animation complete.'); // Debug log
                        isTransitioning = false;
                    }
                });
            }
        }

        // Attach Event Listeners (這段重複了，但為了整合完整性保留，實際部署時可刪除重複的)
        // renderer.domElement.addEventListener('mousemove', handleMouseMove);
        // renderer.domElement.addEventListener('mousedown', handleMouseDown);
        // renderer.domElement.addEventListener('mouseup', handleMouseUp);
        renderer.domElement.addEventListener('click', this.onMouseClick);
        window.addEventListener('keydown', handleKeyDown, false);

        function animate() {
            requestAnimationFrame(animate);

            // 只有當不在第一人稱模式時，才更新 OrbitControls
            if (!isFirstPersonMode && controls) { // 檢查 controls 是否已定義
                controls.update();
            }

            if (renderer && scene && currentCamera) { // 檢查核心 Three.js 物件是否已定義
                renderer.render(scene, currentCamera); // 使用 currentCamera 渲染
            }
        }
        animate();

        // 應用程式初始化完成
        this.isInitialized = true;
    }
}).mount('#app');
