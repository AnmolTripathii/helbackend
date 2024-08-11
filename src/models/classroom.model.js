import mongoose,{Schema} from "mongoose";

const classroomSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    days_in_session: {
        type: [String],
        required: true
    },
    teacher_id: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    
},{timestamps:true});

export const Classroom = mongoose.model('Classroom', classroomSchema);

