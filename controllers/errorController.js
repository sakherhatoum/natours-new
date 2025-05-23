const AppError = require("../utils/appError");

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400);
};

// const handleDuplicateFieldsDB = err => {
//     const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
//     console.log(value);

//     const message = `Duplicate field value: x. Please use another value!`;
//     return new AppError(message, 400)
// }

const handleDuplicateFieldsDB = err => {
    const dupField = Object.keys(err.keyValue)[0];
    const message = `Duplicate field(${dupField}). Please use another value(${err.keyValue[dupField]})!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleJWTError = err => {
    return new AppError('Invalid Token, Please log in again', 401);
}

const handleJWTExpireError = err => {
    return new AppError('Your token has expired! PLease in again', 401)
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProd =  (err, res) => {
    // Operational, trusted error send message to client
    if(err.isOperational){
        res.status(err.statusCode).json({
            status: err,
            message: err.message,
        });

    // Programming or other unknown error: don't leak error details    
    } else {
        // 1) Log error
        console.log('ERROR', err)       

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        })
    }
};

module.exports = (err, req, res, next) => {
   // console.log(err.stack)

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res)
    } else if(process.env.NODE_ENV === 'production') {
        let error = { ...err };

        if (err.name === 'CastError') error = handleCastErrorDB(error);
        if(error.code === 11000) error = handleDuplicateFieldsDB(error);
        if(err.name === 'ValidationError') error = handleValidationErrorDB(error);
        if(err.name === 'JsonWebTokenError') error = handleJWTError(error);
        if(err.name === 'TokenExpiredError') error = handleJWTExpireError(error);
        sendErrorProd(error,res);
    }
}