
var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt=require('bcrypt');
var objectId = require("mongodb").ObjectId;
const collections = require("../config/collections");
const { ObjectId } = require("bson");
const { response } = require("express");
const { Collection } = require("mongodb");

const Razorpay=require('razorpay');
const { resolve } = require("path");

var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret
  });
module.exports={

doSignup:(userdata)=>{

    return new Promise(async(resolve,reject)=>{

        userdata.Password=await bcrypt.hash(userdata.Password,10)
        db.get().collection(collections.USER_COLLECTION).insertOne(userdata).then((data)=>{

            resolve(data)

        })
    })

},

userLogin:(userdata)=>{

return new Promise(async(resolve,reject)=>{

    let loginstatus=false;
    let response={}
    let user=await db.get().collection(collections.USER_COLLECTION).findOne({Email:userdata.Email})

    if(user){

        bcrypt.compare(userdata.Password,user.Password).then((status)=>{

            if(status){
                console.log('login success');
                response.user=user
                response.status=true
                resolve(response)
            }
            else{
                console.log('login failed');
                resolve({status:false})
            }

        })
    }
    else{

        console.log('login failed');
        resolve({status:false})
    }

})
},

/*verify email */
verifyemail:(userinfo)=>{
    return new Promise(async(resolve,reject)=>{
     let result={}
     let email=await db.get().collection(collections.USER_COLLECTION).findOne({Email:userinfo.Email})
     if(email)
     {
         result.emailverified=false;
         resolve(result)
     }
     else
     {
         result.emailverified=true;
         resolve(result)
     }
 
    })
 },

 phoneNumberChecking:(phonenumber)=>{

    return new Promise(async(resolve,reject)=>{
        let response = {}
        let user = await db.get().collection(collections.USER_COLLECTION).findOne({Mobile:phonenumber});
        if(user){
            
            response.exist = true;
            resolve(response);
        }else{
            response.exist = false;
            resolve(response);
        }
    })
},

otpLogin:(phonenumber)=>{
    return new Promise(async(resolve,reject)=>{
let user = await db.get().collection(collections.USER_COLLECTION).findOne({Mobile:phonenumber});
resolve(user);
    })
},

// get all users
getUsers:()=>{

    return new Promise(async(resolve,reject)=>{
        let users=await db.get().collection(collections.USER_COLLECTION).find().toArray();
        resolve(users)
    })
},

// block user

blockUser:(blockId)=>{

    return new Promise(async(resolve,reject)=>{

       await db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(blockId)},{$set:{blocked:true}}).then((response)=>{
            resolve(response)
        })

    })
},
// block or not check

blockorNot:(user)=>{

    return new Promise(async(resolve,reject)=>{
         let blocked=null
         blocked=await db.get().collection(collections.USER_COLLECTION).findOne({_id:objectId(user),blocked:true})

                
                resolve(blocked)
            
    })
},

// unblock user 

unblockUser:(user)=>{
    return new Promise(async(resolve,reject)=>{

       await db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(user)},{$unset:{"blocked":true}}).then((response)=>{
            resolve(response)
        })
    })
},

// add to cart

addTocart:(proId,proPrice,userId)=>{
    let productPrice=parseInt(proPrice)
    let proObj={
        item:objectId(proId),
        quantity:1,
        price:productPrice,
        Subtotal:productPrice
        

    }

    return new Promise(async(resolve,reject)=>{

    let userCart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
      
    if(userCart){
        let proExist=userCart.products.findIndex(product=> product.item==proId)
        if(proExist!=-1){
            db.get().collection(collections.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
            {
               $inc:{'products.$.quantity':1,'products.$.Subtotal':productPrice}
            }
            ).then(()=>{
                resolve()
            })
        }
        else{

        db.get().collection(collections.CART_COLLECTION)
        .updateOne({user:objectId(userId)},
        {
        
                $push:{products:proObj}
            
        }
        ).then((response)=>{
            resolve()
        })
     }
    }
    else{

        let cartObj={
            user:objectId(userId),
            products:[proObj]   
        }
        db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response)=>{

            resolve()
        })

    }

    })
},
// get cart items
getCartproducts:(userId)=>{

    return new Promise(async(resolve,reject)=>{

        let cartItems   =await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match:{user:objectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity',
                    Subtotal:'$products.Subtotal'
                }
            },
            {
                $lookup:{
                    from:collections.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,quantity:1,Subtotal:1,product:{$arrayElemAt:['$product',0]}
                }
            }
           

        ]).toArray()
        resolve(cartItems)
    })
},

getcartCount:(userId)=>{

    return new Promise(async(resolve,reject)=>{
        let count=0

        let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})

        if(cart){

            count=cart.products.length
        }
        resolve(count)
    })
},

// qty increment and dec

changeproductquantity:(details)=>{
    
    details.count=parseInt(details.count)
    console.log(details.count);
    details.quantity=parseInt(details.quantity)
    details.price=parseInt(details.price)
    console.log(details.price);

    return new Promise((resolve,reject)=>{
        if(details.count==-1 && details.quantity==1){
            db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
            {

                $pull:{products:{item:objectId(details.product)}}
            }
            ).then((response)=>{
                resolve({removeProduct:true})
            })
        }
        else{
            
            db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
               $inc:{'products.$.quantity':details.count,'products.$.Subtotal':details.price*details.count}
            }
            ).then((response)=>{
                console.log("kitii"+response);
                resolve({status:true})
            })
        }



       
    })
},

// delete cart product

deleteCartproduct:(deleteDet)=>{
    return new Promise ((resolve,reject)=>{
        db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(deleteDet.cart)},
        {
    
            $pull:{products:{item:objectId(deleteDet.product)}}
    
        }
        ).then((response)=>{
        
        })
        resolve({deleted:true})

    })
   
},
getTotalAmount:(userId)=>{

    return new Promise(async(resolve,reject)=>{

        let total=await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match:{user:objectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:collections.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                }
            },
            {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
                ]).toArray()
        console.log(total+"yui");
        if(total[0]?.total){
             resolve(total[0].total)
        }
        else{
            resolve()
        }
       
    })

},



// category offer total
// getOfferTotalAmount:(userId)=>{

//     return new Promise(async(resolve,reject)=>{

//         let total=await db.get().collection(collections.CART_COLLECTION).aggregate([
//             {
//                 $match:{user:objectId(userId)}
//             },
//             {
//                 $unwind:'$products'
//             },
//             {
//                 $project:{
//                     item:'$products.item',
//                     quantity:'$products.quantity'
//                 }
//             },
//             {
//                 $lookup:{
//                     from:collections.PRODUCT_COLLECTION,
//                     localField:'item',
//                     foreignField:'_id',
//                     as:'product'
//                 }
//             },
//             {
//                 $project:{
//                     item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
//                 }
//             },
//             {
//                 $group:{
//                     _id:null,
//                     total:{$sum:{$multiply:['$quantity','$product.catOfferprice']}}
//                 }
//             }
//                 ]).toArray()
//         console.log(total+"yui");
//         if(total[0]?.total){
//              resolve(total[0].total)
//         }
//         else{
//             resolve()
//         }
       
//     })

// },
// category offer total end

getUserdetails:(userId)=>{
    return new Promise(async(resolve,reject)=>{

        let user=await db.get().collection(collections.USER_COLLECTION).findOne({_id:objectId(userId)})

        resolve(user)
    })
},

// profile address

addAddress:(address,userId)=>{

    console.log("hey");
    address.addressId=new objectId()
    return new Promise(async(resolve,reject)=>{

        let addExist=await db.get().collection(collections.USER_COLLECTION).findOne({_id:objectId(userId),address:{$exists:true}})
        if(addExist){
            
            db.get().collection(collections.USER_COLLECTION).findOne(
            {
                address:{
                    $elemMatch:{
                        name:address.name,
                        house:address.house,
                        street:address.street,
                        district:address.district,
                        state:address.state,
                        phoneNumber:address.phoneNumber
                    }
                    
                }
            }).then((response)=>{
                if(response){
                    console.log("address exist");
                    resolve({addressExist:true})
                }
                else{
                    console.log("update cheytho");
                    db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(userId)},
                    {

                        $push:{
                            address:address
                        }
                    }).then((response)=>{
                        resolve()
                    })
                }
            })

        }
        else{
            console.log("puthiyath address");
            db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(userId)},{
                $set:{
                    address:[address]
                }
                
            })
            resolve()
        }
        

    })

},

getAddresses:(userId)=>{

    return new Promise(async(resolve,reject)=>{


        let allAddress=await db.get().collection(collections.USER_COLLECTION).aggregate(
    
            [{
                $match:{
                    _id:objectId(userId)
                }
                },
                {
                    $project:{
                        address:1,
                        _id:0
                    }

                },
                {
                    $unwind:'$address'
                }
                
            ]).toArray()
            resolve(allAddress)

    })




},
// get publishers

getAllpublisher:()=>{

    return new Promise(async(resolve,reject)=>{

        publisher=await db.get().collection(collections.PRODUCT_COLLECTION).distinct("publisher")
        console.log("hu",publisher);
        resolve(publisher)
    })
},

// get address

getAddress:(addressId,userId)=>{

    return new Promise(async(resolve,reject)=>{
        address=await db.get().collection(collections.USER_COLLECTION).aggregate([
            {
                $match:{
                    _id:objectId(userId)
                }
            },
            {
                $unwind: "$address"
            },
            {
                $match:{
                    "address.addressId":objectId(addressId)
                }
            },
            {
                $project:{
                    address:1,
                    _id:0
                }
            },
        ]).toArray()
        resolve(address)
    })
},

placeOrder:(paymentMethod,userId,address,products,totalprice)=>{

    return new Promise(async(resolve,reject)=>{

        console.log("inside placeorder");

        let status=paymentMethod==='Cod'?'placed':'pending'
            products.forEach(element => {
                element.status=status
            });
            
        let orderObj={ 
            deliveryDetails:{
                Name:address[0].address.name,
                Mobile:address[0].address.phoneNumber,
                House:address[0].address.house,
                Street:address[0].address.street,
                District:address[0].address.district,
                State:address[0].address.state


            },
            userId:objectId(userId),
            PaymentMethod:paymentMethod,
            Products:products,
            totalAmount:totalprice,
            date: new Date().toLocaleString(),
            fulldate: new Date()
        }

        if(paymentMethod==='Cod'){

            
       await db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(userId)})
            resolve()
        })


        }
        else{
           await db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj)
        //     let status=paymentMethod==='Cod'?'placed':'pending'
        // let orderObj={ 
        //     deliveryDetails:{
        //         Name:address[0].address.name,
        //         Mobile:address[0].address.phoneNumber,
        //         House:address[0].address.house,
        //         Street:address[0].address.street,
        //         District:address[0].address.district,
        //         State:address[0].address.state


        //     },
        //     userId:objectId(userId),
        //     PaymentMethod:paymentMethod,
        //     Products:products,
        //     totalAmount:totalprice,
        //     status:status,
        //     date: new Date()
        // } 
        // resolve(orderObj) 
        }
        
        resolve(orderObj)

    })

},

getCartproductlist:(userId)=>{

    return new Promise(async(resolve,reject)=>{
        let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
        resolve(cart.products)
         
    })
},

// get order details admin

getOrders:()=>{

    return new Promise(async(resolve,reject)=>{

        let orders=db.get().collection(collections.ORDER_COLLECTION).find().toArray();
        resolve(orders)

    })

    

},

// edit address
Editaddress:(addressdata,userId)=>{
    console.log(addressdata.name);
    return new Promise(async(resolve,reject)=>{

      await  db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(userId),"address.addressId":objectId(addressdata.addressId)},
        {$set:{
            "address.$.name":addressdata.name,
            "address.$.house":addressdata.house,
            "address.$.street":addressdata.street,
            "address.$.district":addressdata.district,
            "address.$.state":addressdata.state,
            "address.$.phoneNumber":addressdata.phoneNumber
        }})
        resolve();
            
    })
},






// delete address

deleteAddress:(addressId,userId)=>{
    console.log(addressId);
    console.log(userId);
    return new Promise(async(resolve,reject)=>{
       await db.get().collection(collections.USER_COLLECTION).updateOne(
           {
               _id:objectId(userId),
               
            },
            {
                $pull:{address:{addressId:objectId(addressId.addressDelete)}}
            }
            ) 
            resolve(response)
    })
},

// delivery sttis update

updateDeliverystatus:(statusDetails)=>{

    return new Promise(async(resolve,reject)=>{

       await db.get().collection(collections.ORDER_COLLECTION).updateOne(
            {
                _id:objectId(statusDetails.order),"Products.item":objectId(statusDetails.productId)
            },
            {
                $set:{"Products.$.status":statusDetails.status}
            }
            )
            resolve()

    })
},

// get order veiw details

getOrderProducts:(orderId)=>{
    return new Promise(async(resolve,reject)=>{

        let orderItems=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
            {
                $match:{_id:objectId(orderId)}
            },
            {
                $unwind:'$Products'
            },
            {
                $project:{
                    item:'$Products.item',
                    quantity:'$Products.quantity',
                    Subtotal:'$Products.Subtotal',
                    status:'$Products.status'
                }
            },
            {
                $lookup:{
                    from:collections.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,status:1,quantity:1,Subtotal:1,product:{$arrayElemAt:['$product',0]}
                }
            }
           

        ]).toArray()
        
        resolve(orderItems)
    })
},

generateRazorpay:(razorId,totalprice)=>{

    return new Promise((resolve,reject)=>{


        var options ={
            amount:totalprice*100,
            currency:"INR",
            receipt: ''+razorId
    
        };
        console.log(options);
        instance.orders.create(options, function(err, order){
            console.log(err,"order:",order);
            resolve(order)
        });
    

    })

},

// verify payment

verifyPayment:(details)=>{
   

    return new Promise((resolve,reject)=>{
        
        const crypto=require('crypto');
        let hmac = crypto.createHmac('sha256','TskuWXHrZxuZHKZIyZ3PiJWV')

        hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
        hmac=hmac.digest('hex')
        if(hmac==details['payment[razorpay_signature]']){
            resolve()
        }
        else{
            reject()
        }
    })

},

// change delivery status razorpay

changePaymentstatus:(orderId,userId)=>{
    console.log(orderId);
    
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(userId)})
        db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:objectId(orderId._id),"Products.status":"pending"},
        {
            $set:{"Products.$.status":"placed"}
        }
        )
        resolve()
    })
    
},

// my orders

getMyorders:(userId)=>{

    return new Promise(async(resolve,reject)=>{

       let myOrders=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
           {
               $match:{
                   userId:objectId(userId)
               }
           },
           {
               $unwind:"$Products"
           },
           {
               $project:{
                item:'$Products.item',
                quantity:'$Products.quantity',
                Subtotal:'$Products.Subtotal',
                status:'$Products.status',
                cancelled:'$Products.cancelled',
                date:'$date'
               }
           },
           {
            $lookup:{
                from:collections.PRODUCT_COLLECTION,
                localField:'item',
                foreignField:'_id',
                as:'product'
            }
           },
           {
               $project:{
                item:1,status:1,cancelled:1,quantity:1,date:1,Subtotal:1,product:{$arrayElemAt:['$product',0]}
               }
           }
       ]).toArray()
        resolve(myOrders)
    })
},

// cancel order

cancelOrder:(orderId,proId)=>{

    return new Promise((resolve,reject)=>{
     
        db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:objectId(orderId),"Products.item":objectId(proId)},
        {
            $set:{"Products.$.status":"cancelled",
             "Products.$.cancelled":true        
        }
        }
        )
        resolve()

    })
},

// changepassword 

changePassword:(newPwd,userId)=>{
  return new Promise(async(resolve,reject)=>{

    newPwd=await bcrypt.hash(newPwd,10)
    db.get().collection(collections.USER_COLLECTION).updateOne({_id:objectId(userId)},
    {
        $set:{Password:newPwd}
    })
    resolve()
  })

},

// wishlist 

addToWishlist:(proId,userId)=>{
    return new Promise(async(resolve,reject)=>{
        let wishObj={
            item:objectId(proId),
            // price:productPrice,
        }
    
        let userWish=await db.get().collection(collections.WISHLIST_COLLECTION).findOne({user:objectId(userId)})
          
        if(userWish){
            let proExist=userWish.products.findIndex(product=> product.item==proId)
            if(proExist!=-1){
                // db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                // {
                //    $inc:{'products.$.quantity':1,'products.$.Subtotal':productPrice}
                // }
                // ).then(()=>{
                //     resolve()
                // })
            }
            else{
    
            db.get().collection(collections.WISHLIST_COLLECTION)
            .updateOne({user:objectId(userId)},
            {
            
                    $push:{products:wishObj}
                
            }
            ).then((response)=>{
                resolve()
            })
         }
        }
        else{
    
            let wishListObj={
                user:objectId(userId),
                products:[wishObj]   
            }
            db.get().collection(collections.WISHLIST_COLLECTION).insertOne(wishListObj).then((response)=>{
    
                resolve()
            })
    
        }
    
        

    })
},



// buy now place order

buyNowplaceOrder:(paymentMethod,userId,address,productDet,totalprice,coupon)=>{

    return new Promise(async(resolve,reject)=>{

        console.log("inside placeorder");

        let status=paymentMethod==='Cod'?'placed':'pending'
            // products.forEach(element => {
            //     element.status=status
            // });

        let products=[{
            item:productDet._id,
            quantity:1,
            price:productDet.price,
            Subtotal:productDet.price,
            status:status
        }]    
            
        let orderObj={ 
            deliveryDetails:{
                Name:address[0].address.name,
                Mobile:address[0].address.phoneNumber,
                House:address[0].address.house,
                Street:address[0].address.street,
                District:address[0].address.district,
                State:address[0].address.state


            },
            userId:objectId(userId),
            PaymentMethod:paymentMethod,
            Products:products,
            totalAmount:totalprice,
            date: new Date().toLocaleString(),
            fulldate: new Date()
        }
        if(coupon){
            await db.get().collection(collections.COUPON_COLLECTION).updateOne({couponName:coupon},{$push:{"radeemed":{user:objectId(userId)}}})
        }

        if(paymentMethod==='Cod'){

            console.log("jikop");
            await db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(userId)})
            resolve()
        })


        }
        else{
           await db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj)
       
        }
        
        resolve(orderObj)

    })

},

}