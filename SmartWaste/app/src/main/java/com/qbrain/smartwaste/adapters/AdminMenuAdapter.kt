package com.qbrain.smartwaste.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.qbrain.smartwaste.databinding.ItemAdminMenuBinding
import com.qbrain.smartwaste.models.AdminMenuItem

class AdminMenuAdapter(
    private val menuItems: List<AdminMenuItem>,
    private val onItemClick: (AdminMenuItem) -> Unit
) : RecyclerView.Adapter<AdminMenuAdapter.MenuViewHolder>() {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MenuViewHolder {
        val binding = ItemAdminMenuBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return MenuViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: MenuViewHolder, position: Int) {
        holder.bind(menuItems[position])
    }
    
    override fun getItemCount(): Int = menuItems.size
    
    inner class MenuViewHolder(private val binding: ItemAdminMenuBinding) :
        RecyclerView.ViewHolder(binding.root) {
        
        fun bind(menuItem: AdminMenuItem) {
            binding.apply {
                ivIcon.setImageResource(menuItem.icon)
                tvTitle.text = menuItem.title
                
                root.setOnClickListener {
                    onItemClick(menuItem)
                }
            }
        }
    }
}