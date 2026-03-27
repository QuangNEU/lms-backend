const supabase = require('../config/supabase');

const getAllCourses = async () => {
    const { data, error } = await supabase
        .from('Course')
        .select('*')

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

module.exports = {
    getAllCourses
};