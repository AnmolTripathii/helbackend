import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Teacher', 'Student'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    classroom_id: {
        type: Schema.Types.ObjectId,
        ref: 'Classroom',
        default: null 
    }
},{timestamps:true});

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next
})

userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken= function(){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        name:this.name,
        role:this.role,
        classroom_id:this.classroom_id
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

export const User = mongoose.model('User', userSchema);
