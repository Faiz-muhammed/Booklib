var db = require("../config/connection");
var collection = require("../config/collections");
const collections = require("../config/collections");
var objectId = require("mongodb").ObjectId;
const { PRODUCT_COLLECTION } = require("../config/collections");

module.exports = {
  /* add product*/
  addProduct: (product) => {

    return new Promise(async(resolve,reject)=>{

        let response={}

       let productExist=await db.get().collection(collections.PRODUCT_COLLECTION).findOne({isbn:product.isbn})

       if(productExist){
           response.exist=true;
           resolve(response);
       }
       else{

        await db.get().collection(collections.PRODUCT_COLLECTION).insertOne(product).then((data) => {

         response.exist = false;
         response.data = data;
         resolve(response)

        });

       }
    })
   
  },

  /* get product*/
  getAllproducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find()
        .toArray();

      resolve(products);
    });
  },

  /* delete product*/
  deleteProduct: (proId) => {
    return new Promise(async (resolve, reject) => {
      console.log(proId);
      console.log(objectId(proId));
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .deleteOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

/* get product details*/

getProductdetails:(proId)=>{
  return new Promise((resolve,reject)=>{
    db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
      
      resolve(product)
     
    })
  })
},


/* update product details*/

updateProductdetails:(proId,proDetail)=>{

  return new Promise((resolve,reject)=>{

    db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{$set:{

      product_name:proDetail.product_name,
      category:proDetail.category,
      author:proDetail.author,
      publisher:proDetail.publisher,
      isbn:proDetail.isbn,
      quantity:parseInt(proDetail.quantity),
      price:parseInt(proDetail.price),
      description:proDetail.description

    }}).then((status)=>{

      resolve(status)
    })

  })
},

/*admin login */
admindologin:(admindata)=>{
  return new Promise(async(resolve,reject)=>{
      let loginstatus=false;
      let response={};
      let admin=await db.get().collection(collections.ADMIN_COLLECTION).findOne({Email:admindata.Email,Password:admindata.Password})
           if(admin){
                    response.verified=true;
                    resolve(response);
                    }
               else{
                   response.verified=false;
                   console.log('login failed');
                   resolve(response);
               }
        })
      
     
  },

  // category filter

  GetCategoryFilter:(categoryname)=>{
    return new Promise(async(resolve,reject)=>{

      let filtered=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:categoryname})
   .toArray();
    resolve(filtered)
  })
    

  },

  // add banner

  addBanner:(bannerDetails)=>{
    return new Promise(async(resolve,reject)=>{

      await db.get().collection(collections.BANNER_COLLECTION).update({},

        {$set:
          {
          subHeadOne:bannerDetails.subHeadtop,
          mainHeadfirstOne:bannerDetails.mainHeadfirsttop1,
          mainHeadsecondOne:bannerDetails.mainHeadsecondtop1,
          taglineOne:bannerDetails.tagline1,
          BannerId:"topBanner",
          bottomTop:bannerDetails.Topline,
          bottomMiddle:bannerDetails.Middleline,
          bottomBottom:bannerDetails.Bottomline,
          bottomBannerId:"bottomBanner"
        }
      })
        resolve()
    })

  },
  // addBanner:(bannerDetails)=>{
  //   return new Promise(async(resolve,reject)=>{

  //     await db.get().collection(collections.BANNER_COLLECTION).insertOne(
  //         {
  //         subHeadOne:bannerDetails.subHeadtop,
  //         mainHeadfirstOne:bannerDetails.mainHeadfirsttop1,
  //         mainHeadsecondOne:bannerDetails.mainHeadsecondtop1,
  //         taglineOne:bannerDetails.tagline1,
  //         BannerId:"topBanner"
        
  //     })
  //       resolve()
  //   })

  // },
  // get banner details

  getBanner:()=>{
    return new Promise(async(resolve,reject)=>{

      let bannerData=await db.get().collection(collections.BANNER_COLLECTION).findOne()
      resolve(bannerData)
    })

  },

  // add category offer

  AddcategoryOffer:(offerdetails)=>{
    return new Promise(async(resolve,reject)=>{
        console.log(offerdetails);
      let offer=offerdetails.Discount;
    
      await db.get().collection(collections.CATEGORY_OFFER).insertOne(offerdetails).then(async(result)=>{

        let items=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:offerdetails.offerCategory}).toArray();
         
          items.map((product)=>{
          console.log(product);
          let mrp=product.price
          let off=(mrp/100)*offer;
          let priceBackup=product.price
          let offerprice=mrp-off;
          offerprice=offerprice.toFixed(2)
          offerprice=parseInt(offerprice)

          db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},{$set:{price:offerprice,actualPrice:priceBackup}})
          console.log("hui");
        })
      
      })  
      
      resolve()
    })

  },


  getUsercount:()=>{

    return new Promise(async(resolve,reject)=>{

      let userCount=await db.get().collection(collections.USER_COLLECTION).find().count()

      resolve(userCount)
    })
  },

  getRevenue:()=>{

    return new Promise(async(resolve,reject)=>{

     let revenue=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      
        {
          $unwind:"$Products"
        },
        {
          $match:{"Products.status":"delivered"}
        },
        {
          $project:{
            Subtotal:"$Products.Subtotal",
          }
        },
        {
          $project:{
            Subtotal:1,
            _id:0
          }
        },
        {
          $group:{
            _id:null,
            totalRevenue:{$sum:"$Subtotal"}
          }
        }

      ]).toArray()

     
      resolve(revenue[0].totalRevenue)
    })

  },


  getOrdersData:()=>{
    return new Promise(async(resolve,reject)=>{

     let orders=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
       {
         $unwind:"$Products"
       },
       {
         $match:{"Products.status":"delivered"}
       },
       {
         $count:"orderCount"
       }
     ]).toArray()
     resolve(orders[0].orderCount)
    })
  },
   
  // count products

  getproductCount:()=>{

    return new Promise(async(resolve,reject)=>{

      let productCount=await db.get().collection(collections.PRODUCT_COLLECTION).find().count()

      resolve(productCount)
    })
  },

  // daily sales

  getdailySales:()=>{
    return new Promise(async(resolve,reject)=>{

    let dailySales= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      {
          $unwind:"$Products"
      },
        {
          $match:{"Products.status":"delivered"}
            
        },
        {
          $group:{
            _id:{$dateToString:{format:"%Y-%m-%d",date:"$fulldate"}},
            totalAmount:{$sum:"$Products.Subtotal"},
            count:{$sum:1}
          }
        },
        {
          $sort:{_id:-1}
        },
        {
          $limit:7
        }
        
      ]).toArray()
      console.log(dailySales);
      resolve(dailySales)
    })
  },

// pie graph data

getCategorysales:()=>{
  return new Promise(async(resolve,reject)=>{

    let categorySales=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      {
        $unwind:"$Products"
      },
      {
        $match:{"Products.status":"delivered"}
      },
      {
        $project:{
          item:"$Products.item",
          quantity:"$Products.quantity",
          Subtotal:"$Products.Subtotal"
        }
      },
      {
        $lookup:{
          from:collections.PRODUCT_COLLECTION,
          localField:"item",
          foreignField:"_id",
          as:"orderedProducts"
        }
      },
      {
        $unwind:"$orderedProducts"
      },
      {
        $project:{
          quantity:1,
          Subtotal:1,
          category:"$orderedProducts.category"
        }
      },
      {
        $group:{
          _id:"$category",
          catTotal:{$sum:"$Subtotal"},
          count:{$sum:1}
        }
      }
    ]).toArray()
    console.log(categorySales);
    resolve(categorySales)
  })
},


// category offer delete

deleteCatoffer:(catOffer)=>{

  return new Promise(async(resolve,reject)=>{

    await db.get().collection(collections.CATEGORY_OFFER).deleteOne({_id:objectId(catOffer.id)}).then(async(result)=>{

      let items=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:catOffer.catName}).toArray();
      //  console.log("fg",items);
      await items.map((product)=>{

        // let mrp=product.price
        // let off=(mrp/100)*offer;
         let shiftBack=product.actualPrice
        //  console.log(shiftBack,"jing")
         db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},{$set:{price:shiftBack,actualPrice:false}})
      })
      resolve()
    })  
  })
},

// get cat offers

getCatoffers:()=>{

  return new Promise(async(resolve,reject)=>{

    let Catoffers = await db.get().collection(collections.CATEGORY_OFFER).find().toArray()

    resolve(Catoffers)
  })
},

// best selling products

getBestSelling:()=>{

  return new Promise(async(resolve,reject)=>{

    let bestSelling=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      {
        $unwind:"$Products"
      },
      {
        $project:{
          item:"$Products.item",
          quantity:"$Products.quantity",
        }
      },
      {
        $lookup:{
          from:collections.PRODUCT_COLLECTION,
          localField:"item",
          foreignField:"_id",
          as:"bestProducts"
        }
      },
      {
        $unwind:"$bestProducts"
      },
      {
        $project:{
          quantity:1,
          proName:"$bestProducts.product_name"
        }
      },
      {
        $group:{
          _id:"$proName",
          totalQty:{$sum:"$quantity"}
        }
      },
      {
        $sort:{totalQty:-1}
      },
      {
        $limit:10
      }
    ]).toArray()
    console.log(bestSelling);
    resolve(bestSelling)
  })
},



//add product offer 

AddProductOffer:(offerdetails)=>{
  return new Promise(async(resolve,reject)=>{
      console.log(offerdetails);
    let offer=offerdetails.Discount;
  
    await db.get().collection(collections.PRODUCT_OFFER).insertOne(offerdetails).then(async(result)=>{

      let items=await db.get().collection(collections.PRODUCT_COLLECTION).findOne({product_name:offerdetails.offerProduct})
      let catOff=await db.get().collection(collections.CATEGORY_OFFER).findOne({offerCategory:items.category})
       
        // items.map((product)=>{

          if(catOff)
          {
            
          }
          else{
            
            let mrp=items.price
            let off=(mrp/100)*offer;
            let priceBackup=items.price
            let offerprice=mrp-off;
            offerprice=offerprice.toFixed(2)
            offerprice=parseInt(offerprice)
    
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(items._id)},{$set:{price:offerprice,actualPrice:priceBackup}})
            console.log("hui");

          }
        // })
       
    })  
    
    resolve()
  })

},

// get product offer

getprodoffers:()=>{
  return new Promise(async(resolve,reject)=>{

    let Prodoffers = await db.get().collection(collections.PRODUCT_OFFER).find().toArray()

    resolve(Prodoffers)
  })

},

// delete product offer

deleteProdoffer:(ProOffer)=>{

  return new Promise(async(resolve,reject)=>{

    await db.get().collection(collections.PRODUCT_OFFER).deleteOne({_id:objectId(ProOffer.id)}).then(async(result)=>{

      let items=await db.get().collection(collections.PRODUCT_COLLECTION).findOne({product_name:ProOffer.proName})
      //  console.log("fg",items);
      // await items.map((product)=>{

        // let mrp=product.price
        // let off=(mrp/100)*offer;
         let shiftBack=items.actualPrice
        //  console.log(shiftBack,"jing")
         db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(items._id)},{$set:{price:shiftBack,actualPrice:false}})
      // })
      resolve()
    })  
  })
},

// get wishlist details

getWishlistdata:(userId)=>{
  return new Promise(async(resolve,reject)=>{

    let wishData=await db.get().collection(collections.WISHLIST_COLLECTION).aggregate([
      {
        $match:{user:objectId(userId)}
      },
      {
        $unwind:"$products"
      },
      {
        $project:{
          item:"$products.item",
          user:"$user"
        },
      },
      {
          $lookup:{
            from:collections.PRODUCT_COLLECTION,
            localField:"item",
            foreignField:"_id",
            as:"Wishproducts"
          }
      },
      {
        $unwind:"$Wishproducts"
      },
      {
        $project:{
          productId:"$Wishproducts._id",
          productName:"$Wishproducts.product_name",
          price:"$Wishproducts.price",
          author:"$Wishproducts.author",
          publisher:"$Wishproducts.publisher",
          category:"$Wishproducts.category"
        }
      }
    ]).toArray()
    console.log(wishData);
    resolve(wishData)
  })
},

// category offer expiry

checkOfferExpiry:(today)=>{
  return new Promise(async(resolve,reject)=>{
    console.log(today);
    console.log("klp");

   let offerExist= await db.get().collection(collections.CATEGORY_OFFER).find({
      endDate:{
        $lte:today
      }
    }).toArray()

    // product offer check
    let ProdoffExist= await db.get().collection(collections.PRODUCT_OFFER).find({
      endDate:{
        $lte:today
      }
    }).toArray()

    let CouponExist= await db.get().collection(collections.COUPON_COLLECTION).find({
      endDate:{
        $lte:today
      }
    }).toArray()

    if(offerExist){

        // await db.get().collection(collections.CATEGORY_OFFER).deleteOne({_id:objectId(catOffer.id)}).then(async(result)=>{

      // let items=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:catOffer.catName}).toArray();

      //  console.log("fg",items);
      await offerExist.map(async(offers)=>{

        let items=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:offers.offerCategory}).toArray();
         
          console.log("iop",items);
          await items.map(async(product)=>{

            let shiftBack=product.actualPrice
             
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},{$set:{price:shiftBack,actualPrice:false}})
          })
         
          await db.get().collection(collections.CATEGORY_OFFER).deleteOne({offerCategory:offers.offerCategory})
        
      })
    
    // }) 
       
    }
    else{
      console.log("hey");
    }

    // product offer checking
    
    if(ProdoffExist){

      await ProdoffExist.map(async(proOffers)=>{

        let Pros=await db.get().collection(collections.PRODUCT_COLLECTION).find({product_name:proOffers.offerProduct}).toArray();
         
          console.log("iop",Pros);
          await Pros.map(async(product)=>{

            let shiftBack=product.actualPrice
             
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},{$set:{price:shiftBack,actualPrice:false}})
          })
         
          await db.get().collection(collections.PRODUCT_OFFER).deleteOne({_id:objectId(proOffers._id)})
        
      })
      resolve()
    }

    if(CouponExist){
      console.log("hio");
      db.get().collection(collections.COUPON_COLLECTION).deleteMany({endDate:{$lte:today}})
    }

  })
},

// coupons add

addCoupons:(couponData)=>{
   return new Promise((resolve,reject)=>{

    db.get().collection(collections.COUPON_COLLECTION).insertOne(couponData)
    resolve()
   })
},

getcoupons:()=>{
   return new Promise(async(resolve,reject)=>{
    let coupons=await db.get().collection(collections.COUPON_COLLECTION).find().toArray()
    resolve(coupons)
   })
  
},

// delete coupon offer

deleteCoupon:(coup)=>{

   return new Promise((resolve,reject)=>{

    db.get().collection(collections.COUPON_COLLECTION).deleteOne({couponName:coup.couponName})
    resolve()
   })
},

// add coupon offer

applyCoupon:(couponDetails)=>{
  return new Promise(async(resolve,reject)=>{
      console.log(couponDetails);
    let offer=couponDetails.Discount;
  
    await db.get().collection(collections.PRODUCT_OFFER).insertOne(couponDetails).then(async(result)=>{

      let items=await db.get().collection(collections.PRODUCT_COLLECTION).findOne({product_name:couponDetails.offerProduct})
      let catOff=await db.get().collection(collections.COUPON_COLLECTION).findOne({couponDetails:items.category})
       
        // items.map((product)=>{

          if(catOff)
          {
            
          }
          else{
            
            let mrp=items.price
            let off=(mrp/100)*offer;
            let priceBackup=items.price
            let offerprice=mrp-off;
            offerprice=offerprice.toFixed(2)
            offerprice=parseInt(offerprice)
    
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:objectId(items._id)},{$set:{price:offerprice,actualPrice:priceBackup}})
            console.log("hui");

          }
        // })
       
    })  
    
    resolve()
  })

},

// coupon check

checkCoupon:(code,user)=>{
   
  return new Promise(async(resolve,reject)=>{
     console.log(code); 
     let couponUser=await db.get().collection(collections.COUPON_COLLECTION).findOne({couponName:code,"radeemed.user":objectId(user)})
     console.log(couponUser);
      let response={}
     if(couponUser){
      
      console.log("coupon radeemed");
      response.radeemed=true;
      resolve(response)
      

     }
     else
     {
      let coupon=await db.get().collection(collections.COUPON_COLLECTION).findOne({couponName:code})
        // await db.get().collection(collections.COUPON_COLLECTION).updateOne({couponName:code},{$push:{"radeemed":{user:objectId(user)}}})
      
      console.log("ty",coupon);
      response.justradeemed=coupon
      resolve(response)
     }
   
  })
},

// sales report

getSalereport:()=>{

  return new Promise(async(resolve,reject)=>{

    let sale=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      {
        $unwind:"$Products"
      },
      // {
      //   $match:{
      //     fulldate:
      //   }
      // }
      {
        $project:{
          fulldate:1,
          products:"$Products.item",
          status:"$Products.status",
          Qty:"$Products.quantity",
          subtotal:"$Products.Subtotal"
        }
      },
      {
        $group:{
          _id:{$dateToString:{format:'%Y-%m-%d',date:"$fulldate"}},
          prodCount:{$sum:"$Qty"},
          Revenue:{$sum:"$subtotal"}
        }
      },
      {
        $sort:{_id:-1}
      }
    ]).toArray()
    console.log("terr",sale);
    resolve(sale)
  })
},

// best selling for home page

getBestSellingHome:()=>{

  return new Promise(async(resolve,reject)=>{

    let bestSellers=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
      {
        $unwind:"$Products"
      },
      {
        $project:{
          item:"$Products.item",
          quantity:"$Products.quantity",
        }
      },
      {
        $lookup:{
          from:collections.PRODUCT_COLLECTION,
          localField:"item",
          foreignField:"_id",
          as:"bestProducts"
        }
      },
      {
        $unwind:"$bestProducts"
      },
      {
        $project:{
          quantity:1,
          proName:"$bestProducts.product_name",
          category:"$bestProducts.category",
          author:"$bestProducts.author",
          price:"$bestProducts.price",
          imgId:"$bestProducts._id"

        }
      },
      {
        $group:{
          _id:"$proName",
          totalQty:{$sum:"$quantity"},
          category: { "$first": "$category" },
          author:{ "$first": "$author" },
          price:{ "$first": "$price" },
          imgId:{ "$first": "$imgId" },
        }
      },
      {
        $sort:{totalQty:-1}
      },
      {
        $limit:10
      },
      // {
      //   $lookup:{
      //     from:PRODUCT_COLLECTION,
      //     localField:"_id",
      //     foreignField:"_id",
      //     as:"bestProducts"
      //   }
      // },
      // {
      //   $unwind:"$bestProducts"
      // },
      // {
      //   $project:{
      //     proName:"$bestProducts.product_name"
      //   }
      // }
    ]).toArray()
    console.log("best",bestSellers);
    resolve(bestSellers)
  })
},

// remove wish

removeWish:(itemId,user)=>{

  return new Promise((resolve,reject)=>{

    db.get().collection(collections.WISHLIST_COLLECTION).updateOne(
      {
        user:objectId(user)
      },
      {
        $pull:
        {
          products:
          {
            item:objectId(itemId)
          }
        }
      })
      resolve()
  })
},


// search product

searchProducts:(payload)=>{

  return new Promise(async(resolve,reject)=>{

    let products=await db.get().collection(collections.PRODUCT_COLLECTION).find(
      {
        product_name:
              {
                $regex: new RegExp('^'+payload+'.*','i')
              }
      }).toArray()
      resolve(products)
  })
},


// category offer check

catOffexist:(catName)=>{

  return new Promise(async(resolve,reject)=>{

    let Exist=db.get().collection(collections.CATEGORY_OFFER).findOne({offerCategory:catName})
    resolve(Exist)
    
  })
},

// product offer exist

proOffexist:(proName)=>{
  return new Promise(async(resolve,reject)=>{
   
    let Exist=db.get().collection(collections.PRODUCT_OFFER).findOne({offerProduct:proName})
    resolve(Exist)
  })
}

};
