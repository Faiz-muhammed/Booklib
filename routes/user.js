const { response, json } = require("express");
var express = require("express");
const Sync = require("twilio/lib/rest/Sync");

const paypal = require('paypal-rest-sdk');

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id':process.env.client_id, 
  'client_secret': process.env.client_secret
});

var router = express.Router();

var objectId = require("mongodb").ObjectId;

const serviceId = process.env.serviceId
const accountId = process.env.accountId
const authToken = process.env.authToken

const client = require("twilio")(accountId,authToken)

let emailexist=false;
let pwunmatch=false;
let phonenumberExistError =false;
var phoneNumber;
var signupData;
var productView;
var addressExist=false;
var blocked=false
let cartEmty=false;
let wishlistEmty=false;
let filterCat=null;
let categoryname=null;
let pwdNotmatch=false;
let userName=false;

/*helpers*/
var categoryHelper = require("../helpers/category-helper");
var productHelper = require("../helpers/product-helper");
const userHelper = require("../helpers/user-helper");
const { getCartproducts } = require("../helpers/user-helper");
var userhelper = require('../helpers/user-helper');

const verifylogin=(req,res,next)=>{

  if(req.session.user.loggedIn)
  {
   next()
  }
  else{
    console.log("guiop");
    res.redirect('/login')
  }
}
// block or not checking middleware
// const blockcheck=(req,res,next)=>{
//   if(req.session.user){
//     userhelper.blockorNot(req.session.user._id).then((response)=>{
//       if(response==true){
//         req.session.user=null;
//         res.redirect("/login");
//       }
//       else{
//         next();
//       }
//     })
//   }
//   else{
//     next();
//   }
// }
const blockAndverify=(req,res,next)=>{
  console.log("hello");
  if(req.session.user){
   
    userhelper.blockorNot(req.session.user._id).then((response)=>{
            if(response){
              req.session.user=null;
              blocked=true
              res.redirect("/login");
            }
            else{
              next();
            }
          })
  }
  else{

    
    res.redirect("/login");
  }
}

/* GET users listing. */

router.get("/",async function (req, res, next) {


  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)

  }
  productHelper.checkOfferExpiry(new Date())
  let banners=await productHelper.getBanner()
  console.log(banners);
   userName=req.session.user;
   let best=await productHelper.getBestSellingHome()
  // productHelper.getAllproducts().then((products) => {
    res.render("user/index", { user:true,best,cartCount,banners,userName});
  // });
  
});

/*user category page */
router.get("/category",async function (req, res, next) {
  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }
  if(filterCat){
    let category=await categoryHelper.getAllCategories()
    let publishers=await userhelper.getAllpublisher()
    productHelper.GetCategoryFilter(categoryname).then((filtered)=>{
      res.render("user/category", { user: true,filtered,cartCount,category,publishers,userName});
      categoryname=null;
      filterCat=null;
    })

  }
  else{
    let category=await categoryHelper.getAllCategories()
    let publishers=await userhelper.getAllpublisher()
    productHelper.getAllproducts().then((products) => {
      res.render("user/category", { user: true,products,cartCount,category,publishers,userName});
    });
  }
  
  
});

/*user login page */
router.get("/login", function (req, res) {
  console.log('fhd');
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.user?.loggedIn){

    
    res.redirect('/')
  }
  else{
    
    let loginErr=req.session.userloginErr
    res.render("user/user-login", { user:true,loginErr,blocked});
    console.log("ghuy");
    blocked=false;
    req.session.userloginErr=false;
  }
  
});


/*user signup */
router.get("/signup",function(req,res,next){
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
res.render('user/user-signup',{user:true,emailexist})
emailexist=false;
})



/*otp user */
router.get("/otp-verify", function (req,res) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  res.render("user/otp-page", { user: true });
});



/*user signup post */
router.post("/user-signup",(req,res)=>{
console.log(req.body);

signupData=req.body;
if (req.body.Password === req.body.Confirmpwd) {
 
  userhelper.verifyemail(req.body).then((result) => {
    
    console.log(result.emailverified);
    if (result.emailverified) {
      delete req.body.Confirmpwd;
      /*otp send */
      phoneNumber = req.body.Mobile
      phoneNumber = phoneNumber.toString();
      

        userhelper.phoneNumberChecking(phoneNumber).then((response)=>{
         
          if(response.exist==false){
           
            client.verify
            .services(serviceId)
            .verifications.create({
              to:`+91${req.body.Mobile}`,
              channel:"sms"
            })
            .then((resp)=>{
              // console.log(resp);
              // res.status(200).json({resp});
              console.log(phoneNumber);
              res.render('user/signupOtp',{user:true,phoneNumber})
            });
          }else{
            console.log('yui');
            phonenumberExistError =true;
            res.redirect('/phonenumberpage')

          }
        })
      /*otp send end */

     
    } else {
      emailexist = true;
      res.redirect("/signup");
    }
  });
} else {
  pwunmatch = true;
  res.redirect("/signup");
}
}) 

/*user login post */

router.post('/userlogin',async(req,res)=>{
console.log(req.body);

let blockcheck=await userHelper.loginBlockcheck(req.body.Email)
console.log(blockcheck);
if(blockcheck){
  blocked=true;
  res.redirect('/login')
}   
else
{
  userhelper.userLogin(req.body).then((response)=>{
    if(response.status){
      console.log(response.status);
      req.session.user=response.user
      
      req.session.user.loggedIn=true
      console.log(req.session.user);
      res.redirect('/')
    }
    else{
      req.session.userloginErr=true;
      res.redirect('/login')
    }
  })
}

})

/* get phone number page */

router.get('/phonenumberpage',(req,res)=>{
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  if(req.session.user?.loggedIn){
    res.redirect('/')
  }else{
    res.render('user/phonenumberpage',{user:true,phonenumberExistError});
  }
  phonenumberExistError = false;
});

/*post user phonenumber*/


router.post('/phonenumberpage',(req,res)=>{
  console.log('klj');
 phoneNumber = req.body.number
phoneNumber = phoneNumber.toString();

userhelper.phoneNumberChecking(phoneNumber).then((response)=>{
  if(response.exist){
    client.verify
    .services(serviceId)
    .verifications.create({
      to:`+91${req.body.number}`,
      channel:"sms"
    })
    .then((resp)=>{
      // console.log(resp);
      // res.status(200).json({resp});
      console.log(phoneNumber);
      res.render('user/otp-page',{user:true,phoneNumber})
    });
  }else{
    console.log('yui');
    phonenumberExistError =true;
    res.redirect('/phonenumberpage')

  }
})


});

/*otp login post*/

router.get("/otplogin",(req,res)=>{
  console.log('tyu'); 
  let phoneNumber = req.query.phonenumber;
  let otpNumber = (req.query.otpnumber);
  typeof(otpNumber)
  client.verify
  .services(serviceId)
  .verificationChecks.create({
    to:"+91"+phoneNumber,
    code:otpNumber
  })
  .then((resp=>{
    if(resp.valid){
      userhelper.otpLogin(phoneNumber).then((response)=>{
        req.session.user = response;
       console.log(req.session.user);
        req.session.user.loggedIn = true;
        let valid = true;
       res.send(valid);
      })
    }else{
      let valid = false;

      res.send(valid);
    }
  }));
})

/*resend otp login page */
router.get("/resendotp",(req,res)=>{
console.log("fgh");
  userhelper.phoneNumberChecking(phoneNumber).then((response)=>{
    console.log("poi");
    if(response.exist){
      client.verify
      .services(serviceId)
      .verifications.create({
        to:`+91${phoneNumber}`,
        channel:"sms"
      })
      .then((resp)=>{
        // console.log(resp);
        // res.status(200).json({resp});
        console.log(phoneNumber);
        // res.render('user/otp-page',{user:true,phoneNumber})
    
      });
    }else{
      console.log('yui');
      phonenumberExistError =true;
      res.redirect('/phonenumberpage')
  
    }
  })

})
/*signup otp page */
router.get("/signupOtp",(req,res)=>{
  res.render('signupOtp')
})


router.get("/signupOtpsubmit",(req,res)=>{

  console.log('tyu'); 
  let phoneNumber = req.query.phonenumber;
  let otpNumber = (req.query.otpnumber);
  typeof(otpNumber)
  client.verify
  .services(serviceId)
  .verificationChecks.create({
    to:"+91"+phoneNumber,
    code:otpNumber
  })
  .then((resp=>{
    if(resp.valid){
      userhelper.doSignup(signupData).then((response)=>{

        console.log(response);
        req.session.user=response
        req.session.user.loggedIn=true
        res.redirect("/");
        res.send(valid);
      });
      
    
    }else{
      let valid = false;

      res.send(valid);
    }
  }));

})

// single page view
router.get("/singleproduct",(req,res)=>{

  let productId=req.query.proId
  productHelper.getProductdetails(productId).then((product)=>{

    // res.render("user/singleproduct",{user:true,products});
    productView=product;
    console.log(productView);
    res.send(productView)

  })

  
})
router.get("/singlePage",async(req,res)=>{

  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }
console.log("single");
  res.render("user/singleproduct",{user:true,productView,userName,cartCount})
  // productView=null;
})

// shopping cart

router.get("/cart",blockAndverify,async(req,res,next)=>{
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  let cartProducts=await userhelper.getCartproducts(req.session.user._id)
  let totalvalue=await userhelper.getTotalAmount(req.session.user._id)
  console.log(cartProducts);
  if(cartProducts.length<=0){
    cartEmty=true
  }
  res.render("user/cartNew",{user:true,cartProducts,user:req.session.user,totalvalue,cartEmty,userName})
  cartEmty=false;
})
// add to cart

router.get("/add-to-cart",blockAndverify,(req,res)=>{
  console.log("api called");
  if(req.session?.user){
    let proId=req.query.productid;
    let proPrice=req.query.productprice;
    let user=req.session.user._id;
    console.log(proPrice);
    userhelper.addTocart(proId,proPrice,user).then(()=>{

      // res.redirect('/singlePage')
      res.json({status:true})
    })
  }
  else{

    res.json({status:false})
  }

  
    

 
})

// add quantity in cart

router.post("/change-product-quantity",blockAndverify,(req,res,next)=>{

  console.log("hey");
  console.log(req.body)
   userhelper.changeproductquantity(req.body).then(async(response)=>{
    response.total=await userhelper.getTotalAmount(req.body.user);
    // response.subtotal=await userhelper.getSubtotal(req.body.user);
    res.json(response)
    
  })
})

// delete cart product

router.post("/deleteCartproduct",blockAndverify,(req,res,next)=>{

  userhelper.deleteCartproduct(req.body).then((response)=>{

    res.json(response)

  })
})

// check out page
router.get("/checkout",blockAndverify,async(req,res)=>{
  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }

  let currentUser=req.session.user._id;
  let cartProducts=await userhelper.getCartproducts(req.session.user._id)
  let userDet=await userhelper.getAddresses(req.session.user._id)
  let total=await userhelper.getTotalAmount(req.session.user._id)
  res.render("user/checkout",{user:true,total,userDet,cartProducts,currentUser,addressExist,userName,cartCount})
  addressExist=false;
})

// user profile
router.get("/profile",blockAndverify,async(req,res)=>{

  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }

let userdet=await userhelper.getUserdetails(req.session.user._id)
let addresses=await userhelper.getAddresses(req.session.user._id)
console.log(addresses);
  res.render("user/userProfille",{user:true,userdet,addresses,pwdNotmatch,cartCount,userName})
  pwdNotmatch=false;
})

// add address
router.get("/addaddress",blockAndverify,(req,res)=>{

  res.render("user/addAddress",{user:true,addressExist,userName})
  addressExist=false;

})

// add address post

router.post("/Addressdata",blockAndverify,(req,res)=>{

  let address=req.body;
  let user=req.session.user._id
  userhelper.addAddress(address,user).then((response)=>{
    if(response?.addressExist){
      addressExist=true;
      res.redirect("/addaddress")
    }
    else{

      res.redirect("/profile")

    }

    
  })
})

router.get("/editAddress",blockAndverify,async(req,res)=>{

  let addressId=req.query.id
  let userId=req.session.user._id

  let address=await userhelper.getAddress(addressId,userId)
  console.log(address);
  res.render("user/editAddress",{user:true,address,userName})
})

router.get("/placeOrder",blockAndverify,async(req,res)=>{

  let deliveryAddress=req.query.deliveryAddress
  let userId=req.query.userId;
  let paymentMethod=req.query.paymentMethod;
  let coupon=req.query.coupon;
  let couponTotal=req.query.couponTotal;
  let totalprice;
  console.log("trewytr");
  console.log(couponTotal);
  console.log(paymentMethod);
 
  

  let products=await userhelper.getCartproductlist(userId)
  let address=await userhelper.getAddress(deliveryAddress,userId)
  if(couponTotal!="false")
  {
    console.log("hjk");
   totalprice=couponTotal;
  }
  else
  {
    console.log("its other");
    totalprice=await userhelper.getTotalAmount(userId) 
  }
  
  let paytotal=totalprice.toString()

  let razorId= new objectId()
  console.log("ithan"); 
  console.log(address);

   
  userhelper.placeOrder(paymentMethod,userId,address,products,totalprice,coupon).then((response)=>{

    if(paymentMethod==='Cod'){

      
      res.json({codSuccess:true})
     
    }
    else if(paymentMethod==='Razorpay'){
       req.session.orderDetails=response;
      userhelper.generateRazorpay(razorId,totalprice).then((response)=>{
       res.json(response)
         
      })
    }
    else{
      req.session.orderDetails=response;
      const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://booklib.ml/paypalSuccess",
            "cancel_url": "https://booklib.ml/paymentFailed"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "price": paytotal,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": paytotal
            },
            "description": "This is the payment description."
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error;
      } else {
          for(let i=0;i<payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
              // res.redirect(payment.links[i].href);
              let url = payment.links[i].href;
              res.json({data:true,url:url})

            }
          }
          // console.log("Create Payment Response");
          // console.log(payment);
          // res.json({paypalSuccess:true})
          
      }
  });
    }

   
  })


  
})

// payment success paypal

router.get("/paypalSuccess",blockAndverify,async(req,res)=>{
  const payerId=req.query.PayerID;
  const paymentId=req.query.paymentId;

  let totalprice=await userhelper.getTotalAmount(req.session.user._id)
  console.log(totalprice);
   let paytotal=totalprice.toString()

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": paytotal
        }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log("jikop");
        console.log(error.response);
        throw error;
    } else {
      console.log("look");
        console.log(JSON.stringify(payment));
        userhelper.changePaymentstatus(req.session.orderDetails,req.session.user._id).then(()=>{
          console.log("payment sucessful");
          res.redirect("/ordersuccess")
        })
    }
});
})

// order success page 

router.get("/ordersuccess",blockAndverify,(req,res)=>{

  res.render("user/orderSuccess",{user:true})
})


// edit address form post 
router.post("/editaddressData",blockAndverify,(req,res)=>{

  let addressDetails=req.body;
  let userId=req.session.user._id
  console.log(req.body);
  userhelper.Editaddress(addressDetails,userId).then(()=>{

    res.redirect("/profile")
  })
})

// add address checkout

router.post("/addAddrcheckout",blockAndverify,(req,res)=>{

  let address=req.body;
  let user=req.session.user._id
  userhelper.addAddress(address,user).then((response)=>{
    if(response?.addressExist){
      addressExist=true;
      res.redirect("/checkout")
    }
    else{

      res.redirect("/checkout")

    }

    
  })
})

// category filter

router.post("/categoryFilter",(req,res)=>{
  console.log("hello");
   categoryname=req.body.categoryname;
  console.log(categoryname);

  productHelper.GetCategoryFilter(categoryname).then((filtered)=>{

    console.log("filter",filtered);
    filterCat=filtered;
    res.json(filtered)
  })
  
})


// delete address

router.post("/deleteAddress",blockAndverify,(req,res)=>{

  let userId=req.session.user._id
  console.log(req.body);
  
  userhelper.deleteAddress(req.body,userId).then((response)=>{

    res.json({status:true})
   
  })
})

// verify payment online pay

router.post("/verify-payment",(req,res)=>{
  console.log(req.body);
  console.log(req.session.orderDetails);

  userhelper.verifyPayment(req.body).then(()=>{
    console.log(req.body['receipt']);
    userhelper.changePaymentstatus(req.session.orderDetails,req.session.user._id).then(()=>{
      console.log("payment sucessful");
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false})
  })
})

// my orders

router.get("/myOrders",blockAndverify,async(req,res)=>{
  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }
  let userdet=await userhelper.getUserdetails(req.session.user._id)
  userhelper.getMyorders(req.session.user._id).then((myOrders)=>{
   
    res.render("user/myOrders",{user:true,myOrders,userName,cartCount,userdet})
  })
 
})


// cancel order

router.post("/cancelOrder",(req,res)=>{


   let orderId=req.body.orderId;
   let proId=req.body.proId;

  userhelper.cancelOrder(orderId,proId).then(()=>{

    res.json({status:true})
  }) 
})

// change password

router.post("/changePassword",(req,res)=>{

  let newPassword=req.body.newpassword
  let confirmpwd=req.body.confirmpassword

  if(newPassword===confirmpwd){
   userhelper.changePassword(newPassword,req.session.user._id).then(()=>{
     res.redirect("/profile")
   }) 
  }
  else{
    pwdNotmatch=true;
    console.log("pw no match");
    res.redirect("/profile")
  }

})

/*user logout*/

router.get('/logout',(req,res)=>{

  req.session.user=null
  res.redirect('/')
})



// payment fail handle

router.get("/paymentFailed",blockAndverify,(req,res)=>{

  res.render("user/paymentFailed",{user:true})
})

// wishlist page

router.get("/wishList",blockAndverify,async(req,res)=>{

  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }
  
  let user=req.session.user._id
  let wishData=await productHelper.getWishlistdata(user)
  console.log(wishData);
  
  if(wishData.length<=0){
    wishlistEmty=true
  }
  res.render("user/wishlist",{user:true,wishData,userName,cartCount,wishlistEmty})
  wishlistEmty=false;

})


// add to wishlist

router.get("/AddtoWishlist",blockAndverify,(req,res)=>{

  if(req.session?.user){
    console.log("ok alle");
    let proId=req.query.productid;
    let user=req.session.user._id;
    userhelper.addToWishlist(proId,user).then(()=>{

      // res.redirect('/singlePage')
      res.json({status:true})
    })
  }
  else{

    res.json({status:false})
  }
})

// buy now

router.get("/buynow",blockAndverify,async(req,res)=>{

  let cartCount=null;
  if(req.session.user){

  cartCount=await userhelper.getcartCount(req.session.user._id)
  
  }

  console.log(req.query.productid);
  console.log("klop");
  let proId=req.query.productid;
  let currentUser=req.session.user._id
  let buynowProduct= await productHelper.getProductdetails(proId)
  console.log(buynowProduct);

  let userDet=await userhelper.getAddresses(req.session.user._id)
  let total=buynowProduct.price;
  res.render("user/buyNow",{user:true,total,userDet,buynowProduct,currentUser,addressExist,cartCount,userName})
  addressExist=false;

})

// buy now address add

router.post("/addbuyAddresscheckout",blockAndverify,(req,res)=>{

  let address=req.body;
  let user=req.session.user._id
  userhelper.addAddress(address,user).then((response)=>{
    if(response?.addressExist){
      addressExist=true;
      res.redirect("/buynow")
    }
    else{

      res.redirect("/buynow")

    }

    
  })
})

// buy now placeorder

router.get("/placeOrderBuynow",blockAndverify,async(req,res)=>{

  let deliveryAddress=req.query.deliveryAddress
  let userId=req.query.userId;
  let paymentMethod=req.query.paymentMethod
  let coupon=req.query.coupon
  console.log(paymentMethod);
  let proId=req.query.proId;
  let couponTotal=req.query.couponTotal;
  let totalprice;
  console.log(couponTotal);
  console.log(paymentMethod);
  
  
    let products=await productHelper.getProductdetails(proId)
    let address=await userhelper.getAddress(deliveryAddress,userId)
    if(couponTotal!="false")
    {
      totalprice=couponTotal;
    }
    else
    {
      totalprice=products.price;
    }
     
    let paytotal=totalprice.toString()

  let razorId= new objectId()
  console.log("ithan"); 
  console.log(address);

   
  userhelper.buyNowplaceOrder(paymentMethod,userId,address,products,totalprice,coupon).then((response)=>{

    if(paymentMethod==='Cod'){

      
      res.json({codSuccess:true})
     
    }
    else if(paymentMethod==='Razorpay'){
       req.session.orderDetails=response;
      userhelper.generateRazorpay(razorId,totalprice).then((response)=>{
        console.log('hello world',response);
       res.json(response)
         
      })
    }
    else{
      req.session.orderDetails=response;
      const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://booklib.ml/paypalSuccess",
            "cancel_url": "https://booklib.ml/paymentFailed"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "price": paytotal,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": paytotal
            },
            "description": "This is the payment description."
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error;
      } else {
          for(let i=0;i<payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
              // res.redirect(payment.links[i].href);
              let url = payment.links[i].href;
              res.json({data:true,url:url})

            }
          }
          // console.log("Create Payment Response");
          // console.log(payment);
          // res.json({paypalSuccess:true})
          
      }
  });
    }

   
  })


  
})

// check coupon

router.post("/CheckCoupon",blockAndverify,(req,res)=>{
  
  let couponCode=req.body.code
  let user=req.session.user._id
  console.log(user);

  productHelper.checkCoupon(couponCode,user).then((response)=>{
  
      res.json(response)
    
  })
})

// remove from wishlist

router.get("/removeWish",blockAndverify,(req,res)=>{

  let user=req.session.user._id
  let itemId=req.query.productid
  productHelper.removeWish(itemId,user).then(()=>{
     
     res.json({status:true})
   
  })
})

// search bar

router.post('/getProducts',async(req,res) =>{
  let payload = req.body.payload.trim();
  console.log(payload);
  let search= await productHelper.searchProducts(payload)
  //  search=search.slice(0,10);

   console.log(search);
   res.send({payload:search});
})





module.exports = router;
