var db = require("../config/connection")
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectId;
const collections = require("../config/collections");
const { response } = require("express");


module.exports = {
  addCategory: (category) => {
    console.log(category);
    return new Promise(async(resolve,reject)=>{
      let response={}
      let categoryExist=await db.get().collection(collections.CATEGORY_COLLECTION).findOne({categoryname:category.categoryname})

      if(categoryExist){
       response.exist=true
       resolve(response);
      }
      else{
        console.log(category);
        await db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data)=>{
            response.exist=false;
            response.data=data;
            resolve(response)
        })
      }
    })
    
  },

  getAllCategories:()=>{

   return new Promise(async(resolve,reject)=>{

   let categories=await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
   console.log(categories);
   resolve(categories)

   })

  },

  deleteCategory:(catId)=>{

    return new Promise(async(resolve,reject)=>{

     console.log(catId);
     console.log(objectId(catId));
     db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({'_id':objectId(catId)}).then((response)=>{

     resolve(response)

     })


    })


  }

  


};
