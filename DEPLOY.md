# Render + MongoDB 部署指南

## 步骤1: 创建MongoDB Atlas数据库 (2分钟)

1. 访问 https://www.mongodb.com/cloud/atlas
2. 注册免费账号
3. 创建Project → Create Cluster
4. 选择免费 `M0` Cluster
5. 选地区（推荐新加坡或亚太）
6. Create Cluster，等待部署（~5分钟）
7. **重点**：创建Database User
   - 访问 Security → Database Access
   - Add New Database User
   - Username: `mingfei` (你的名字)
   - Password: `生成安全密码` (记下来)
   - Add User
8. **获取连接字符串**：
   - 回到Cluster页面 → Connect
   - Connect Your Application
   - 选 MongoDB for Python 3.11+
   - 复制connection string，看起来像：
   ```
   mongodb+srv://mingfei:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - 把PASSWORD替换成刚刚设置的密码
   - 把 `test` 改成 `idea-todo`（或自定义database名）
9. Network Access → Add IP Address
   - Allow access from anywhere (0.0.0.0/0)

## 步骤2: 上传GitHub (3分钟)

```bash
cd /Users/lumingfei/Desktop/科研workflow/idea-todo-cli

# 初始化git
git init
git add .
git commit -m "Initial commit: Idea-Todo PWA with MongoDB"

# 创建GitHub repo
# 访问 https://github.com/new
# 名字: idea-todo-cli
# 不初始化README (保持空)

# 推送代码
git remote add origin https://github.com/你的用户名/idea-todo-cli.git
git branch -M main
git push -u origin main
```

## 步骤3: 在Render部署 (5分钟)

1. 访问 https://render.com
2. 用GitHub账号登录
3. 点 New → Web Service
4. 选 Connect a repository
   - 选 idea-todo-cli repo
   - Connect
5. 配置Web Service:
   - **Name**: idea-todo-cli
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app_mongodb:app`
6. **环境变量** (Environment):
   - 点 Add Secret
   - **Key**: `MONGODB_URI`
   - **Value**: 粘贴MongoDB连接字符串（从步骤1）
   ```
   mongodb+srv://mingfei:PASSWORD@cluster0.xxxxx.mongodb.net/idea-todo?retryWrites=true&w=majority
   ```
7. 点 Create Web Service
8. 等待部署 (~2分钟)
9. 完成！得到公网URL，形如：
   ```
   https://idea-todo-cli.onrender.com
   ```

## 步骤4: 本地测试 (可选)

```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env，填入MongoDB URI

# 安装依赖
pip install -r requirements.txt

# 本地运行
python3.12 app_mongodb.py
```

访问 `http://localhost:5000`

## 常见问题

**Q: MongoDB连接失败**
- 检查密码是否正确（有特殊字符需要URL编码，如@→%40）
- 检查IP白名单（Network Access）是否包含0.0.0.0/0
- 等待Cluster完全启动（可能需要10分钟）

**Q: Render部署失败**
- 检查Procfile是否正确：`web: gunicorn app_mongodb:app`
- 检查requirements.txt是否存在
- 查看Render logs找错误信息

**Q: 如何修改代码？**
```bash
# 本地修改 → push到GitHub → Render自动redeploy
git add .
git commit -m "Your message"
git push origin main
```
Render会自动检测到push，重新部署（~1分钟）。

**Q: 如何备份数据？**
MongoDB Atlas免费版自动每天备份，可在Atlas dashboard恢复。

---

## 总结

| 阶段 | 时间 | 说明 |
|------|------|------|
| MongoDB Atlas | 5-10分钟 | 注册+创建集群 |
| 上传GitHub | 3分钟 | git push |
| Render部署 | 5分钟 | 配置环境变量→deploy |
| **总共** | **15-20分钟** | 全自动公网应用 |

之后只需在GitHub修改代码 → 自动部署到Render（每次push）。
