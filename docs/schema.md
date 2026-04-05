# DB Schema
---

**User Table**


| Column Names | Types | 
|---|---|
| id | uuid | 
| username | varchar |
| password | varchar |
| email | varchar |
| last_logged_in | timestamp |
| created_at | timestamp |
---
**Email Table**

Note: all fields are optional over here

| Column Names | Types | 
|---|---|
| id | int | 
| username | varchar |
| password | varchar |
| smtp | varchar |
| smtp_port | int |
| from | varchar |
---
**Project Table**

| Column Names | Types | 
|---|---|
| id | uuid (serves as webhook endpt)| 
| name | varchar | 
| github_url | varchar | 
| branch_name | varchar |
| webhook_secret | varchar |
| receive_email_notf | bool |
| auto_deploy | bool |
---
**Project Commands Table**

| Column Names | Types | 
|---|---|
| id | uuid |
| proj_id | uuid |
| seq_no | int (start from 1) |
| cmd | text |
---
**Deployment Table**

| Column Names | Types | 
|---|---|
| id | uuid |
| proj_id | uuid |
| started_at | timestamp |
| finished_at | timestamp? |
---
**Deployment Logs Table**

| Column Names | Types | 
|---|---|
| id | uuid |
| deploy_id | uuid |
| cmd | text |
| log | text |
| status | varchar (running/success/failed) |
| started_at | timestamp |
| finished_at | timestamp |

---
**Path Settings Table**

| Column Names | Types | 
|---|---|
| id | uuid |
| path | varchar |
| sequence | int |
| created_at | timestamp |