const { response } = require("express");
var express = require("express");
var router = express.Router();
var fs=require("fs")

/*helpers*/
var categoryHelper = require("../helpers/category-helper");
var productHelper = require("../helpers/product-helper");
const userHelper = require("../helpers/user-helper");
const { route } = require("./user");

var adminlogerr=false;
var categoryExisterror=false;
var catOfferExist=false;
var proOfferExist=false;
let sale=false;

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin){

    res.redirect("login");

  }
  else{
    res.render("admin/admin-login",{adminlogin:true,adminlogerr});
    adminlogerr=false;  
  }
  
});

router.get("/login",async function(req, res, next) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin)
  {
    let orderCount= await productHelper.getOrdersData()
    let usercount=await productHelper.getUsercount()
    let revenue=await productHelper.getRevenue()
    let proCount=await productHelper.getproductCount()
    let dailySales=await productHelper.getdailySales()
    let bestSell=await productHelper.getBestSelling()
    let preferedPay=await productHelper.preferredPayment()
    // let DailySale=await productHelper.getDailysale()
    

  let dailyAmount=[]
    

    dailySales.map(daily=>{
      dailyAmount.push(daily.totalAmount)
    })
    
    dailyAmount=JSON.stringify(dailyAmount)
    console.log(dailyAmount);
        
    res.render("admin/dashboard",{admin:true,orderCount,usercount,revenue,proCount,dailyAmount,bestSell,preferedPay});
  }
  else{
    res.redirect('/admin')
  }
});

// get chart datas

router.get("/getChartdata",async(req,res)=>{


  let dailySales=await productHelper.getdailySales()
  let catSales=await productHelper.getCategorysales()
  console.log(catSales);
  
    let dateofDays=[]

    let categoryAmount=[]
    let categoryName=[]

   
    dailySales.map(daily=>{   
      dateofDays.push(daily._id)
    })

    catSales.map(cat=>{
      categoryName.push(cat._id)
      categoryAmount.push(cat.catTotal)
    })

    console.log(dateofDays);
   console.log(categoryName);
   console.log(categoryAmount);
    res.json({dateofDays,categoryName,categoryAmount})
})



/*Post admin login */
router.post('/adminlogin',function(req,res){
  console.log(req.body);
 
  productHelper.admindologin(req.body).then((response)=>{
    if(response.verified){
      req.session.adminloggedin=true
      req.session.admin=req.body.Email;
      res.redirect('/admin/');
    }
    else{
      req.session.loginerr=true
      adminlogerr=true;
      res.redirect('/admin/')
    }
  })

});
 

router.get("/product-management", function (req, res, next) {
  if(req.session.adminloggedin){
    productHelper.getAllproducts().then((products) => {
      res.render("admin/product-management", { admin: true, products });
    });
  }
  else{
    res.redirect("/admin")
  }
 
});

/* add product*/
router.get("/add-product", function (req, res, next) {
  if(req.session.adminloggedin){
    categoryHelper.getAllCategories().then((categories) => {
      res.render("admin/Add-newproducts", { admin: true, categories });
    });
  }
  else{
    res.redirect("/admin")
  }
 
});

/* category product*/
router.get("/category-product", function (req, res, next) {
  if(req.session.adminloggedin){
    categoryHelper.getAllCategories().then((categories) => {
      res.render("admin/category-product", { admin: true, categories,categoryExisterror});
      categoryExisterror=false;
    });
  }
  else{
    res.redirect("/admin")
  }
 
});

/* add category*/
router.post("/add-category", (req, res) => {
  console.log(req.body);
  categoryHelper.addCategory(req.body).then((response)=>{
    if(response.exist){

      categoryExisterror=true;
      res.redirect("/admin/category-product");
    }
    else
    {
      res.redirect("/admin/category-product");
    }

  }) 
  
});

/* delete category*/
router.post("/delete-category/", (req, res) => {
  let catId = req.body.id;
  console.log(catId);
  categoryHelper.deleteCategory(catId).then((response) => {
    console.log("category deleted");

    res.json({ status: true });
  });
});

/* add product post*/

router.post("/addprod", function (req, res) {
 
  req.body.quantity=parseInt(req.body.quantity)
  req.body.price = parseInt(req.body.price)
  console.log(req.body);
  productHelper.addProduct(req.body).then((response)=>{
    if(response.exist){

      productExisterror="This product already exists"
      res.redirect("/admin/add-product");
    }
    else{
      let image1= req.files.image1;
      let image2= req.files.image2;
      let image3= req.files.image3;
      isbn = response.data.insertedId;

      image1.mv('./public/product-images/'+isbn+'1.png',(err,done)=>{

        if(!err){

          image2.mv('./public/product-images/'+isbn+'2.png',(err,done)=>{

            if(!err){

              image3.mv('./public/product-images/'+isbn+'3.png',(err,done)=>{

                if(!err){
                  res.redirect("/admin/add-product");
                }
              })
            }
          })
        }
        else{
          console.log(err);
        }  
          
      })

    }
  })
})


  


/* delete product*/
router.post("/delete-product/", (req, res) => {
  let proId = req.body.id;
  console.log(proId);
  productHelper.deleteProduct(proId).then((response) => {
    console.log("product deleted");

    res.json({ status: true });
  });
});


/* edit product*/

router.get('/edit-product/:id',async(req,res)=>{
  if(req.session.adminloggedin){
    let product=await productHelper.getProductdetails(req.params.id)
    let categories=await categoryHelper.getAllCategories()
  
    res.render('admin/edit-product',{admin:true,product,categories})
  }
  else{
    res.redirect("/admin")
  }
})


/* post edit product*/

router.post('/editprod/:id',(req,res)=>{
let id=req.params.id;
console.log("shashi ok");
  productHelper.updateProductdetails(req.params.id,req.body).then((response)=>{

    let image1 = req.files?.image1;
    let image2 = req.files?.image2;
    let image3 = req.files?.image3;
    console.log(image1);
    if(image1){
      fs.unlink('./public/product-images/'+id+'1.png',function (err) {
      if(err) throw err;
      console.log('File deleted!');  
      })
      image1.mv('./public/product-images/'+id+'1.png',(err,done)=>{

        if(!err){

        }
        else{
          console.log(err);
        }
      })
    }

    if(image2){
      fs.unlink('./public/product-images/'+id+'2.png',function (err) {
      if(err) throw err;
      console.log('File deleted!');  
      })
      image2.mv('./public/product-images/'+id+'2.png',(err,done)=>{

        if(!err){

        }
        else{
          console.log(err);
        }
      })
    }
    if(image3){
      fs.unlink('./public/product-images/'+id+'3.png',function (err) {
      if(err) throw err;
      console.log('File deleted!');  
      })
      image3.mv('./public/product-images/'+id+'3.png',(err,done)=>{

        if(!err){
          
        }
        else{
          console.log(err);
        }
      })
    }
    
      
    
  })
  res.redirect('/admin/product-management')
})

//user management
router.get("/userManagement",(req,res)=>{

  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin)
  {
    userHelper.getUsers().then((users)=>{

      res.render("admin/user-management",{admin:true,users})
    
    });
  }
  else{
    res.redirect('/admin')
  }

})

/*admin logout router */
router.get('/adminlogout',(req,res)=>{
  req.session.adminloggedin=false;
  req.session.admin=null;
  res.redirect('/admin/')
})


// block user
router.post("/blockuser",(req,res)=>{
let blockId=req.body.id;

userHelper.blockUser(blockId).then((response)=>{

  console.log(response);
  res.json({ status: true });
})

})

// unblock user
router.post("/unblockuser",(req,res)=>{
  let unblockId=req.body.id;
  userHelper.unblockUser(unblockId).then((response)=>{
    console.log(response);
    res.json({ status: true });
  })

})

// order management 

router.get("/orders",async(req,res)=>{

  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin)
  {
    let orders=await userHelper.getOrders()
    console.log(orders);
    res.render("admin/orders",{admin:true,orders})
  }
  else{
    res.redirect('/admin')
  }
  
 
  
})

// delivery status update

router.post("/deliverystatus",(req,res)=>{

  console.log(req.body);

  userHelper.updateDeliverystatus(req.body).then(()=>{

    res.json({status:true})
  })
})

// view order

router.get("/viewOrder",async(req,res)=>{


  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin)
  {
    let orderId=req.query.orderId
    console.log(orderId);
    let orderDetails=await userHelper.getOrderProducts(orderId)
    console.log(orderDetails);
    res.render("admin/viewOrder",{admin:true,orderDetails});
  }
  else{
    res.redirect('/admin')
  }

 
})

// banner management

router.get("/bannerManagement",(req,res)=>{

  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.adminloggedin)
  {
    productHelper.getBanner().then((bannerData)=>{

      console.log(bannerData);
      res.render("admin/Ads",{admin:true,bannerData})
  
    })
  
  }
  else{
    res.redirect('/admin')
  }

  
  
})


// banner management post

router.post("/bannermanage", function (req, res) {
 
  console.log(req.body);

      let image1= req.files?.image1;
      let image2= req.files?.image2;
      // let image3= req.files.image3;
      console.log(req.body);
     if(image1)
     {
      image1.mv('./public/banners/topBanner.png',(err,done)=>{
        console.log("image 1 updated");
      })
     }

     if(image2)
     {
      image2.mv('./public/banners/bottomBanner.png',(err,done)=>{
        console.log("image 2 updated");
      })
     }
    
     productHelper.addBanner(req.body).then((response)=>{
   
      res.redirect("/admin/bannerManagement")
      
  })
})

// offer page

router.get("/catOffers",async(req,res)=>{

  if(req.session.adminloggedin){

   let catOffer=await productHelper.getCatoffers()
   console.log(catOffer);
   await categoryHelper.getAllCategories().then((categories) => {
      res.render("admin/Offers",{admin:true,categories,catOffer,catOfferExist});
      catOfferExist=false;
    });
  }
  else{
    res.redirect("/admin")
  }

})


// category offer

router.post("/categoryOffer",async(req,res)=>{
 
   let offerDetails=req.body;
   offerDetails.showStartDate=offerDetails.startDate
   offerDetails.showEndDate=offerDetails.endDate
   offerDetails.startDate=new Date(offerDetails.startDate)
   offerDetails.endDate=new Date(offerDetails.endDate)
   offerDetails.Discount=parseInt(offerDetails.Discount)
   
  let offExist=await productHelper.catOffexist(offerDetails.offerCategory)
  console.log(offExist);
  if(offExist){
     catOfferExist=true
     res.redirect("/admin/catOffers")
  }
  else{
   
    productHelper.AddcategoryOffer(offerDetails).then(()=>{

      res.redirect("/admin/catOffers")
    })
  }

})

// category offer delete

router.post("/deleteCategoryoffer",(req,res)=>{


  productHelper.deleteCatoffer(req.body).then(()=>{

    res.json({status:true})
  })

})


// PRODUCT OFFERS

router.get("/prodOffer",async(req,res)=>{

  if(req.session.adminloggedin){

    let productOffers=await productHelper.getprodoffers()
    console.log(productOffers);
    await productHelper.getAllproducts().then((products) => {
      res.render("admin/productOffer",{admin:true,products,productOffers,proOfferExist});
      proOfferExist=false;
     });
   }
   else{
     res.redirect("/admin")
   }
 

})


// product offer post

router.post("/productOffer",async(req,res)=>{

  let prodOfferDetails=req.body;

  prodOfferDetails.showStartDate=prodOfferDetails.startDate
  prodOfferDetails.showEndDate=prodOfferDetails.endDate
  prodOfferDetails.startDate=new Date(prodOfferDetails.startDate)
  prodOfferDetails.endDate=new Date(prodOfferDetails.endDate)
  prodOfferDetails.Discount=parseInt(prodOfferDetails.Discount)

  let prooffExist=await productHelper.proOffexist(prodOfferDetails.offerProduct)
  console.log(prooffExist);
  if(prooffExist){
     proOfferExist=true
     res.redirect("/admin/prodOffer")
  }
  else{
   
    productHelper.AddProductOffer(prodOfferDetails).then(()=>{

      res.redirect("/admin/prodOffer")
    })

  }

})

// delete product offer

router.post("/deleteProductoffer",(req,res)=>{


  productHelper.deleteProdoffer(req.body).then(()=>{

    res.json({status:true})
  })

})

// coupons

router.get("/coupons",async(req,res)=>{

  if(req.session.adminloggedin){

    let coupons=await productHelper.getcoupons()
  console.log(coupons);
  res.render("admin/coupons",{admin:true,coupons})

   }
   else{
     res.redirect("/admin")
   }
  

})

router.post("/couponsSubmit",(req,res)=>{

  let couponData=req.body
  console.log("jkl");
  console.log(couponData);
  couponData.showStartdate=couponData.startDate
  couponData.showEndDate=couponData.endDate
  couponData.startDate=new Date(couponData.startDate)
  couponData.endDate=new Date(couponData.endDate)
  couponData.Discount=parseInt(couponData.Discount);
    
    productHelper.addCoupons(couponData).then(()=>{

      res.redirect("/admin/coupons")

    })

})

router.post("/deleteCoupon",(req,res)=>{

  let couponData=req.body;

  productHelper.deleteCoupon(couponData).then(()=>{

    res.json({status:true})
  })


})

// reports

router.get("/reportsPage",async(req,res)=>{

  if(req.session.adminloggedin){

    console.log("kolp");
  
  res.render("admin/reports",{admin:true,sale})

  }
  else{
    res.redirect("/admin") 
  }

})

router.post("/dailySalesReport",async(req,res)=>{

   let startDate= new Date(req.body.startDate)
   let endDate=new Date (req.body.endDate)
   sale=await productHelper.getSalereport(startDate,endDate)
   res.redirect("/admin/reportsPage")

})



// user report

// router.get("/userReport",async(req,res)=>{
  
//   if(req.session.adminloggedin){

//     console.log("kolp");
//    let user=await productHelper.getUserReport()
//   res.render("admin/userReport",{admin:true,user})

//   }
//   else{
//     res.redirect("/admin") 
//   }
// })






module.exports = router;

