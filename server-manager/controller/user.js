
// 引入 User 数据库
const { User } = require("../model/user")
// 引入 bcrypt 加密数据
const bcrypt = require('bcrypt');

// 注册用户 post "/user"
exports.register = async (req, res, next) => {
    try {
        // 获取中间件validate中的req.validValue校验。获取的是req.body数据处理后的结果
        const { email, name, password } = req.validValue
        // 1.查询邮箱是否被注册过了
        let useEamil = await User.findOne({ email })
        // 2.如果注册了，我们就不能再次注册，直接返回失败的响应
        if (useEamil) {
            return res.status(400).json({
                code: 400,
                msg: "该用户已被注册",
                data: { email }
            })
        }
        // 3.如果没有注册过，我们对密码进行加密，注册后返回成功的响应
        // 3.1  密码加密
        const salt = await bcrypt.genSalt(10)
        const saltPwd = await bcrypt.hash(password, salt)
        // 3.2 创建 mongoose User 实例,这里对象要和存入数据库对象一致
        const saltUser = new User({
            email,
            password: saltPwd,
            name
        })
        // 3.3 进行存储
        await saltUser.save()

        // 3.4 成功：响应数据
        res.status(200).json({
            code: 200,
            msg: "注册成功",
            data: email
        }
        )


    } catch (error) {
        next(error)
    }
}

// 获取所有用户 get "/user"
exports.getUserList = async (req, res, next) => {
    try {
        // 1.查询用户
        let userList = await User.find()
        // 2.如果不存在，返回失败
        if (!userList) {
            return res.status(400).json({
                code: 400,
                msg: "访问的用户不存在"
            })
        }
        // 3.如果存在返回成功的响应
        res.status(200).json({
            code: 200,
            msg: "获取成功",
            data: { userList }
        })

    } catch (error) {
        next(error)
    }
}

// 获取指定用户 get "/user/:id"
exports.getUser = async (req, res, next) => {
    try {
        //1. 获取传入的id参数和query参数
        let userId = req.params.id
        const { field = "" } = req.query;
        const selectFields = field.split(";").filter(f => f).map(item => '+' + item).join(' ')

        // 2.查询用户  实现用户的选择查询
        let user = await User.findById(userId).select(selectFields)

        // 3.如果没有查询到用户返回失败的响应
        if (!user) return res.status(400).json({
            code: 400,
            msg: "访问的用户不存在"
        })
        // 4. 获取 user 返回成功的响应
        res.status(200).json({
            code: 200,
            msg: "指定用户查询成功",
            data: { user }
        })
    } catch (error) {
        next(error)
    }
}

// 编辑/修改用户  patch "/user/:id"
exports.updateUser = async (req, res, next) => {
    try {
        //1.获取用户id和body用户数据
        let userId = req.params.id
        let body = req.body
        let { password } = req.body
        // 2. 密码加密
        const salt = await bcrypt.genSalt(10)
        const saltPwd = await bcrypt.hash(password, salt)
        body.password = saltPwd
        // 2.查询用户并返回修改
        const data = await User.findByIdAndUpdate(userId, body)
        // 3.查询失败
        if (!data) {
            res.status(400).json({
                code: 400,
                msg: "更新用户失败"
            })
        }
        // 4.更新成功
        body.password = password
        res.status(200).json({
            code: 200,
            msg: "更新成功",
            data: { updateUser: body }
        })

    } catch (error) {
        next(error)
    }
}

// 删除指定用户 delete "/user/:id"
exports.deleteUser = async (req, res, next) => {
    try {
        // 1.获取用户id
        const userId = req.params.id
        // 2.查询并删除指定id的用户
        const deleState = await User.findByIdAndDelete(userId)
        // 3.删除失败返回删除失败
        if (!deleState) {
            return res.status(400).json({
                code: 400,
                msg: "删除用户失败",
                value: {
                    _id: userId
                }
            })
        }
        // 4.删除成功
        const data = req.body
        res.status(200).json({
            code: 200,
            msg: "删除成功",
            data
        })

    } catch (error) {
        next(error)
    }
}

// 获取关注列表 get "/:id/following"
exports.listFollowing = async (req, res, next) => {
    try {
        // 获取id
        let userId = req.params.id
        const user = await User.findById(userId).select("+following").populate("following")
        //获取失败
        if (!user) {
            return res.status(400).json({
                code: 400,
                msg: "获取关注列表失败"
            })
        }
        // 获取成功
        res.status(200).json({
            code: 200,
            msg: "获取关注列表成功",
            data: user
        })
    } catch (error) {
        next(error)
    }

}

// 关注 put "/following/:id"
exports.follow = async (req, res, next) => {
    try {
        //  使用 token 的用户_id 去关注 params传入的id
        // 1.获取userData 
        let userId = req.userData._id
        // 
        const user = await User.findById(userId.toString()).select("+following")
        // 2.如果关注过了，直接return
        if (user.following.map(id => id.toString()).includes(req.params.id)) {
            return res.status(400).json({
                code: 400,
                msg: "已关注 关注失败"
            })
        }

        // 3.如果没有关注，我们再关注
        user.following.push(req.params.id)
        await user.save()
        res.status(200).json({
            code: 200,
            msg: `关注成功`,
            data: user
        })


    } catch (error) {
        next(error)
    }
}
// 取消关注 delete "/following/:id"
exports.unfollow = async (req, res, next) => {
    try {
        //1. 拿到token解析后的id
        const userId = req.userData._id
        //2. 查询 token 解析后 id 的粉丝集合
        const user = await User.findById(userId.toString()).select("+following")
        //3. 获取所关注的用户索引
        const index = user.following.map(id => id.toString()).indexOf(req.params.id)

        if (index == -1) {
            return res.status(400).json({
                code: 400,
                msg: "用户未关注 取消关注失败"
            })
        }
        // 4.已经关注，就取消操作
        const cancel = user.following.splice(index, 1)
        await user.save()
        res.status(200).json({
            code: 200,
            msg: "取消关注成功",
            data: cancel
        })

    } catch (error) {
        next(error)
    }
}

// 获取某个用户的粉丝表 get /:id/followers
exports.listFollowers = async (req, res, next) => {
    try {
        //1.查询 对应id的粉丝列表
        const id = req.params.id
        // populate将用户数据展示出来
        const user = await User.findOne({ _id: id }).select("+following").populate("following")
        // 2.查询失败 返回对应失败的消息
        if (!user) return res.status(400).json({
            code: 400,
            msg: "查询粉丝列表失败"
        })
        //3.查询成功 返回成功的信息
        res.status(200).json({
            code: 200,
            msg: "查询粉丝列表成功",
            data: user.following
        })
    } catch (error) {
        next(error)
    }
}

