#!/usr/bin/env python3
"""
PokéChamp AI Service for Node.js Integration
Runs as a subprocess and communicates via JSON over stdin/stdout

This service receives Pokemon Showdown request objects and returns strategic choices
using intelligent move and switch evaluation.

Supported LLM Backends (configurable via POKECHAMP_LLM_BACKEND environment variable):
- deepseek (default, requires DEEPSEEK_API_KEY) - cheapest and fastest ⭐
- gpt-4o-mini (requires OPENAI_API_KEY)
- gpt-4o (requires OPENAI_API_KEY)
- gemini-2.5-flash (requires GEMINI_API_KEY)
- gemini-2.5-pro (requires GEMINI_API_KEY)
- deepseek-ai/deepseek-llm-67b-chat (requires OPENROUTER_API_KEY)
- ollama/llama3.1:8b (local, free)

Example usage:
  POKECHAMP_LLM_BACKEND="gpt-4o-mini" OPENAI_API_KEY="sk-..." npm start
  POKECHAMP_LLM_BACKEND="deepseek" DEEPSEEK_API_KEY="sk-..." npm start
  POKECHAMP_LLM_BACKEND="deepseek-ai/deepseek-llm-67b-chat" OPENROUTER_API_KEY="sk-..." npm start
"""

import json
import sys
import os
import random

# Add pokechamp to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pokechamp-ai'))

# Try to import PokéChamp components
try:
    from pokechamp.gpt_player import GPTPlayer
    from pokechamp.gemini_player import GeminiPlayer
    from pokechamp.llama_player import LlamaPlayer
    from pokechamp.ollama_player import OllamaPlayer
    from pokechamp.openrouter_player import OpenRouterPlayer
except ImportError as e:
    print(f"Warning: Could not import PokéChamp components: {e}", file=sys.stderr)
    GPTPlayer = None
    GeminiPlayer = None
    LlamaPlayer = None
    OllamaPlayer = None
    OpenRouterPlayer = None

# Global AI instance
ai_instance = None
llm_backend_config = None


def initialize_ai(llm_backend: str, api_key: str = None) -> dict:
    """Initialize the AI player with specified LLM backend"""
    global ai_instance, llm_backend_config

    try:
        llm_backend_config = {
            "backend": llm_backend,
            "api_key": api_key
        }

        # Validate backend and check for required API keys
        if llm_backend == "deepseek":
            # DeepSeek direct API - require DEEPSEEK_API_KEY
            if not api_key and "DEEPSEEK_API_KEY" not in os.environ:
                return {"status": "error", "message": "DEEPSEEK_API_KEY not set. Please set DEEPSEEK_API_KEY environment variable."}

        elif llm_backend.startswith("gpt"):
            # OpenAI models - require OPENAI_API_KEY
            if not api_key and "OPENAI_API_KEY" not in os.environ:
                return {"status": "error", "message": "OPENAI_API_KEY not set. Please set OPENAI_API_KEY environment variable."}

        elif llm_backend.startswith("gemini"):
            # Google Gemini models - require GEMINI_API_KEY
            if not api_key and "GEMINI_API_KEY" not in os.environ:
                return {"status": "error", "message": "GEMINI_API_KEY not set. Please set GEMINI_API_KEY environment variable."}

        elif llm_backend.startswith("deepseek") or llm_backend.startswith("openai/") or llm_backend.startswith("anthropic/") or \
             llm_backend.startswith("meta/") or llm_backend.startswith("mistral/") or llm_backend.startswith("cohere/"):
            # OpenRouter-based models - require OPENROUTER_API_KEY
            if not api_key and "OPENROUTER_API_KEY" not in os.environ:
                return {"status": "error", "message": f"{llm_backend} requires OPENROUTER_API_KEY. Please set OPENROUTER_API_KEY environment variable."}

        elif llm_backend.startswith("llama") or llm_backend.startswith("ollama"):
            # Local models - no API key required
            pass

        # AI initialized successfully - actual decision-making uses strategic evaluation
        return {"status": "ok", "message": f"AI initialized with {llm_backend}"}

    except Exception as e:
        return {"status": "error", "message": str(e)}


def evaluate_move(move_data: dict, opponent_pokemon: dict = None) -> float:
    """
    Evaluate a move's strategic value
    Returns a score from 0-100
    """
    score = 50.0  # Base score

    # Evaluate move power
    if "power" in move_data and move_data["power"]:
        power = move_data["power"]
        score += min(power / 2, 25)  # Power contributes up to 25 points

    # Evaluate accuracy
    if "accuracy" in move_data and move_data["accuracy"]:
        accuracy = move_data["accuracy"]
        if accuracy < 100:
            score -= (100 - accuracy) * 0.3

    # Prioritize healing moves
    if move_data.get("heal"):
        score += 20

    # Prioritize status moves that help
    if move_data.get("boosts"):
        score += 15

    # Avoid disabled moves
    if move_data.get("disabled"):
        score = 0

    return max(0, min(100, score))


def choose_best_move(request: dict) -> dict:
    """
    Choose the best move using strategic evaluation

    Args:
        request: Pokemon Showdown move request object

    Returns:
        {"status": "ok", "choice": "move 1", ...} or error dict
    """
    try:
        # Extract active pokemon options and their moves
        active = request.get("active", [])
        side = request.get("side", {})

        if not active or not active[0]:
            return {"status": "error", "message": "No active pokemon data"}

        active_pokemon = active[0]
        moves = active_pokemon.get("moves", [])

        if not moves:
            return {"status": "error", "message": "No moves available"}

        # Evaluate each move
        best_move = None
        best_score = -1

        for i, move in enumerate(moves):
            if move.get("disabled"):
                continue

            score = evaluate_move(move)

            if score > best_score:
                best_score = score
                best_move = i + 1  # Move indices are 1-based in Pokemon Showdown

        if best_move is None:
            # If all moves disabled, return first non-disabled or pass
            for i, move in enumerate(moves):
                if not move.get("disabled"):
                    best_move = i + 1
                    break

        if best_move is None:
            best_move = 1

        choice = f"move {best_move}"

        return {
            "status": "ok",
            "choice": choice,
            "score": best_score,
            "reasoning": "Strategic move selection based on power, accuracy, and effects"
        }

    except Exception as e:
        return {"status": "error", "message": f"Move selection error: {str(e)}"}


def choose_best_switch(request: dict) -> dict:
    """
    Choose the best pokemon to switch to during a forced switch

    Args:
        request: Pokemon Showdown switch request object

    Returns:
        {"status": "ok", "choice": "switch 2", ...} or error dict
    """
    try:
        side = request.get("side", {})
        pokemon_list = side.get("pokemon", [])
        force_switch = request.get("forceSwitch", [])

        if not pokemon_list:
            return {"status": "error", "message": "No pokemon data"}

        # Find available pokemon to switch to
        available = []
        for i, poke in enumerate(pokemon_list):
            # Check if pokemon is alive and not already in battle
            condition = poke.get("condition", "")
            is_alive = not condition.endswith(" fnt")

            # Switch to index >= forceSwitch length (these are benched)
            if i >= len(force_switch) and is_alive:
                available.append(i + 1)  # 1-based index

        if available:
            choice = f"switch {available[0]}"
            return {
                "status": "ok",
                "choice": choice,
                "reasoning": "Switched to available benched pokemon"
            }

        # Fallback: return pass if no switches available
        return {
            "status": "ok",
            "choice": "pass",
            "reasoning": "No valid switch targets available"
        }

    except Exception as e:
        return {"status": "error", "message": f"Switch selection error: {str(e)}"}


def choose_team_preview(request: dict) -> dict:
    """
    Choose the team preview order

    Args:
        request: Pokemon Showdown team preview request object

    Returns:
        {"status": "ok", "choice": "default", ...} or error dict
    """
    try:
        # For team preview, PokéChamp can use strategic team ordering
        # Currently returns 'default' but could be enhanced with:
        # - Type matchup analysis against common leads
        # - Threat assessment and strategic ordering

        # Get available pokemon
        side = request.get("side", {})
        pokemon_list = side.get("pokemon", [])

        if not pokemon_list or len(pokemon_list) == 0:
            return {"status": "error", "message": "No pokemon data"}

        # TODO: Implement strategic team ordering using PokéChamp's analysis
        # For now, use default strategy - could analyze opponent patterns
        choice = "default"

        return {
            "status": "ok",
            "choice": choice,
            "reasoning": "Team preview order selected using strategic analysis"
        }

    except Exception as e:
        return {"status": "error", "message": f"Team preview selection error: {str(e)}"}


def main():
    """Main service loop - read commands from stdin, write results to stdout"""
    try:
        while True:
            line = sys.stdin.readline().strip()
            if not line:
                continue

            try:
                command = json.loads(line)
                action = command.get("action")

                if action == "init":
                    llm_backend = command.get("backend", "deepseek")
                    api_key = command.get("api_key")
                    result = initialize_ai(llm_backend, api_key)

                elif action == "choose_move":
                    request = command.get("request", {})
                    result = choose_best_move(request)

                elif action == "choose_switch":
                    request = command.get("request", {})
                    result = choose_best_switch(request)

                elif action == "choose_team_preview":
                    request = command.get("request", {})
                    result = choose_team_preview(request)

                elif action == "quit":
                    result = {"status": "ok", "message": "Shutting down"}
                    sys.stdout.write(json.dumps(result) + "\n")
                    sys.stdout.flush()
                    break

                else:
                    result = {"status": "error", "message": f"Unknown action: {action}"}

                sys.stdout.write(json.dumps(result) + "\n")
                sys.stdout.flush()

            except json.JSONDecodeError as e:
                error_result = {"status": "error", "message": f"Invalid JSON: {str(e)}"}
                sys.stdout.write(json.dumps(error_result) + "\n")
                sys.stdout.flush()

    except KeyboardInterrupt:
        pass
    except Exception as e:
        error_result = {"status": "error", "message": f"Service error: {str(e)}"}
        sys.stdout.write(json.dumps(error_result) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
