#!/usr/bin/env python3.12
"""
Simple Idea & Todo Tracker CLI
Store ideas and todos locally in JSON format
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Any

DATA_DIR = Path.home() / ".idea-todo"
DATA_DIR.mkdir(exist_ok=True)
IDEAS_FILE = DATA_DIR / "ideas.json"
TODOS_FILE = DATA_DIR / "todos.json"


def load_data(filepath: Path) -> list[dict]:
    """Load data from JSON file, return empty list if missing."""
    if not filepath.exists():
        return []
    with open(filepath) as f:
        return json.load(f)


def save_data(filepath: Path, data: list[dict]) -> None:
    """Save data to JSON file."""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


def generate_id() -> str:
    """Generate a simple ID based on timestamp."""
    return datetime.now().strftime("%Y%m%d%H%M%S")


# ===== IDEA Commands =====
def idea_add(args: argparse.Namespace) -> None:
    """Add a new idea."""
    ideas = load_data(IDEAS_FILE)
    idea = {
        "id": generate_id(),
        "title": args.title,
        "desc": args.desc or "",
        "tags": args.tags or [],
        "created": datetime.now().isoformat(),
    }
    ideas.append(idea)
    save_data(IDEAS_FILE, ideas)
    print(f"✓ Idea added: {idea['id']}")


def idea_list(args: argparse.Namespace) -> None:
    """List all ideas, optionally filter by tag."""
    ideas = load_data(IDEAS_FILE)
    if not ideas:
        print("No ideas yet.")
        return

    if args.tag:
        ideas = [i for i in ideas if args.tag in i.get("tags", [])]

    for idea in ideas:
        tags_str = ", ".join(idea.get("tags", []))
        print(f"[{idea['id']}] {idea['title']}")
        if idea.get("desc"):
            print(f"    {idea['desc']}")
        if tags_str:
            print(f"    Tags: {tags_str}")


def idea_delete(args: argparse.Namespace) -> None:
    """Delete an idea by ID."""
    ideas = load_data(IDEAS_FILE)
    ideas = [i for i in ideas if i["id"] != args.id]
    save_data(IDEAS_FILE, ideas)
    print(f"✓ Idea {args.id} deleted.")


# ===== TODO Commands =====
def todo_add(args: argparse.Namespace) -> None:
    """Add a new todo."""
    todos = load_data(TODOS_FILE)
    todo = {
        "id": generate_id(),
        "title": args.title,
        "idea_id": args.idea or "",
        "deadline": args.deadline or "",
        "priority": args.priority or "normal",
        "status": "pending",
        "created": datetime.now().isoformat(),
    }
    todos.append(todo)
    save_data(TODOS_FILE, todos)
    print(f"✓ Todo added: {todo['id']}")


def todo_list(args: argparse.Namespace) -> None:
    """List todos, optionally filter by status."""
    todos = load_data(TODOS_FILE)
    if not todos:
        print("No todos yet.")
        return

    if args.status:
        todos = [t for t in todos if t["status"] == args.status]

    for todo in todos:
        status_icon = "✓" if todo["status"] == "done" else "○"
        print(f"{status_icon} [{todo['id']}] {todo['title']}")
        if todo.get("deadline"):
            print(f"    Due: {todo['deadline']}")
        if todo.get("priority") != "normal":
            print(f"    Priority: {todo['priority']}")


def todo_done(args: argparse.Namespace) -> None:
    """Mark a todo as done."""
    todos = load_data(TODOS_FILE)
    for todo in todos:
        if todo["id"] == args.id:
            todo["status"] = "done"
            break
    save_data(TODOS_FILE, todos)
    print(f"✓ Todo {args.id} marked as done.")


def todo_delete(args: argparse.Namespace) -> None:
    """Delete a todo by ID."""
    todos = load_data(TODOS_FILE)
    todos = [t for t in todos if t["id"] != args.id]
    save_data(TODOS_FILE, todos)
    print(f"✓ Todo {args.id} deleted.")


def main():
    parser = argparse.ArgumentParser(description="Idea & Todo Tracker")
    subparsers = parser.add_subparsers(dest="type", required=True)

    # Idea subcommands
    idea_parser = subparsers.add_parser("idea")
    idea_subs = idea_parser.add_subparsers(dest="action", required=True)

    add_idea = idea_subs.add_parser("add")
    add_idea.add_argument("title")
    add_idea.add_argument("--desc", default="")
    add_idea.add_argument("--tags", nargs="+", default=[])
    add_idea.set_defaults(func=idea_add)

    list_idea = idea_subs.add_parser("list")
    list_idea.add_argument("--tag", default="")
    list_idea.set_defaults(func=idea_list)

    del_idea = idea_subs.add_parser("delete")
    del_idea.add_argument("id")
    del_idea.set_defaults(func=idea_delete)

    # Todo subcommands
    todo_parser = subparsers.add_parser("todo")
    todo_subs = todo_parser.add_subparsers(dest="action", required=True)

    add_todo = todo_subs.add_parser("add")
    add_todo.add_argument("title")
    add_todo.add_argument("--idea", default="")
    add_todo.add_argument("--deadline", default="")
    add_todo.add_argument("--priority", default="normal", choices=["low", "normal", "high"])
    add_todo.set_defaults(func=todo_add)

    list_todo = todo_subs.add_parser("list")
    list_todo.add_argument("--status", default="", choices=["pending", "done"])
    list_todo.set_defaults(func=todo_list)

    mark_done = todo_subs.add_parser("done")
    mark_done.add_argument("id")
    mark_done.set_defaults(func=todo_done)

    del_todo = todo_subs.add_parser("delete")
    del_todo.add_argument("id")
    del_todo.set_defaults(func=todo_delete)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
